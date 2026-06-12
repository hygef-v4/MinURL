from typing import Optional, List
from datetime import date, timedelta
from collections import Counter
import re
import qrcode
import io

from fastapi import APIRouter, HTTPException, Request, BackgroundTasks, Depends
from fastapi.responses import RedirectResponse, StreamingResponse
from postgrest.exceptions import APIError
from user_agents import parse as ua_parse

from app.utils import encode_base62
from app.database import supabase
from app.schemas import (
    URLRequest, URLResponse, AnalyticsResponse, TopItem, DailyClick,
    APIKeyCreate, APIKeyResponse
)
from app.config import settings, logger
from app.rate_limiter import limiter
from app.safe_browsing import check_url_safety
from app.auth import get_current_user_id, get_optional_user_id, generate_new_api_key

router = APIRouter()

RE_CUSTOM_ALIAS = re.compile(r"^[a-zA-Z0-9_-]+$")
RESERVED_ALIASES = {"health", "api", "favicon.ico", "robots.txt", "docs", "redoc", "openapi.json"}

# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def handle_database_error(e: Exception, context_msg: str) -> HTTPException:
    """Centralized database exception handler to map Postgrest errors to HTTP status codes."""
    if isinstance(e, APIError):
        logger.error(f"{context_msg} (APIError): message={e.message}, code={e.code}, details={e.details}", exc_info=True)
        if e.code == "23505":
            return HTTPException(status_code=409, detail="Data already exists (duplicate entry).")
        elif e.code == "23503":
            return HTTPException(status_code=400, detail="Invalid relational reference.")
        elif e.code == "22P02":
            return HTTPException(status_code=400, detail="Invalid input parameter format.")
        else:
            return HTTPException(status_code=400, detail=f"Database query error: {e.message}")
    else:
        logger.error(f"{context_msg} (General Error): {str(e)}", exc_info=True)
        return HTTPException(status_code=500, detail=f"{context_msg}: {str(e)}")


def _extract_click_info(request: Request, url_id: int) -> dict:
    """Parse request headers into a click analytics record dict."""
    # --- User-Agent parsing ---
    ua_string = request.headers.get("user-agent", "")
    ua = ua_parse(ua_string)

    if ua.is_bot:
        device = "bot"
    elif ua.is_mobile:
        device = "mobile"
    elif ua.is_tablet:
        device = "tablet"
    else:
        device = "desktop"

    browser = ua.browser.family or "Unknown"
    os_name = ua.os.family or "Unknown"

    # --- Referrer ---
    referrer = request.headers.get("referer", "") or request.headers.get("referrer", "")
    if not referrer:
        referrer = "direct"
    else:
        # Keep only origin (scheme + host) to avoid long query strings
        try:
            from urllib.parse import urlparse
            parsed = urlparse(referrer)
            referrer = f"{parsed.scheme}://{parsed.netloc}" if parsed.netloc else referrer
        except Exception:
            pass

    # --- Country via Vercel headers (production) or fallback ---
    country = request.headers.get("x-vercel-ip-country", "")
    city    = request.headers.get("x-vercel-ip-city", "")

    if not country:
        # Local dev: tag as Localhost; avoids slow external GeoIP calls
        forwarded_for = request.headers.get("x-forwarded-for", "")
        client_ip = forwarded_for.split(",")[0].strip() if forwarded_for else (
            request.client.host if request.client else ""
        )
        if client_ip in ("127.0.0.1", "::1", "localhost"):
            country = "Localhost"
        else:
            country = "Unknown"

    if not city:
        city = "Unknown"

    return {
        "url_id": url_id,
        "referrer": referrer,
        "country": country,
        "city": city,
        "browser": browser,
        "os": os_name,
        "device": device,
    }


def _log_click(url_id: int, click_data: dict) -> None:
    """Background task: insert click record and increment urls.clicks_count."""
    try:
        supabase.table("clicks").insert(click_data).execute()
        # Use rpc to atomically increment clicks_count.
        supabase.rpc("increment_clicks", {"row_id": url_id}).execute()
    except Exception as e:
        # Non-critical – log and swallow so it never breaks redirects
        logger.error(f"Background click logging failed for url_id={url_id}: {e}")


# ──────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────

@router.get("/health", tags=["Health Check"])
def health_check():
    return {"status": "ok", "message": "API is healthy"}


@router.post("/api/v1/shorten", response_model=URLResponse, tags=["URL Shortener"])
@limiter.limit("10/minute")
async def shorten_url(
    request: Request,
    url_req: URLRequest,
    user_id: Optional[str] = Depends(get_optional_user_id)
):
    try:
        url_string = str(url_req.long_url)

        # 1. Kiểm tra an toàn URL
        is_safe = await check_url_safety(url_string)
        if not is_safe:
            raise HTTPException(
                status_code=400, 
                detail="This link is unsafe (listed in malicious warnings blacklist)."
            )

        # 2. Xử lý Custom Alias nếu có
        custom_alias = url_req.custom_alias
        if custom_alias:
            custom_alias = custom_alias.strip()
            if not RE_CUSTOM_ALIAS.match(custom_alias):
                raise HTTPException(
                    status_code=400, 
                    detail="Alias can only contain letters, numbers, hyphens (-) and underscores (_)."
                )
            if custom_alias.lower() in RESERVED_ALIASES:
                raise HTTPException(
                    status_code=400, 
                    detail="This alias is a reserved system keyword and cannot be used."
                )
            
            # Kiểm tra xem đã tồn tại chưa
            existing = supabase.table("urls").select("id").eq("short_code", custom_alias).execute()
            if existing.data:
                raise HTTPException(
                    status_code=409, 
                    detail="This custom alias is already in use."
                )
            
            insert_data = {
                "long_url": url_string,
                "short_code": custom_alias
            }
            if user_id:
                insert_data["user_id"] = user_id
                
            response = supabase.table("urls").insert(insert_data).execute()
            if not response.data:
                logger.error("Supabase error: No data returned on insert.")
                raise HTTPException(status_code=500, detail="Failed to save URL.")
            
            short_code = custom_alias
        else:
            # Tạo ngẫu nhiên bằng Base62 sau khi chèn dòng
            insert_data = {"long_url": url_string}
            if user_id:
                insert_data["user_id"] = user_id

            response = supabase.table("urls").insert(insert_data).execute()
            if not response.data:
                logger.error("Supabase error: No data returned on insert.")
                raise HTTPException(status_code=500, detail="Failed to save URL.")

            db_id = response.data[0]["id"]
            short_code = encode_base62(db_id)

            supabase.table("urls").update({"short_code": short_code}).eq("id", db_id).execute()

        return URLResponse(
            short_code=short_code,
            short_url=f"{settings.BASE_DOMAIN}/{short_code}",
            long_url=url_string,
            qr_code_url=f"{settings.BASE_DOMAIN}/api/v1/qrcode/{short_code}"
        )
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        raise handle_database_error(e, "Failed to shorten URL")


@router.get("/api/v1/history", response_model=List[URLResponse], tags=["URL Shortener"])
async def get_user_history(user_id: str = Depends(get_current_user_id)):
    try:
        response = (
            supabase.table("urls")
            .select("short_code, long_url, clicks_count")
            .eq("user_id", user_id)
            .order("id", desc=True)
            .limit(20)
            .execute()
        )
        urls_list = []
        for item in response.data:
            short_code = item.get("short_code")
            if not short_code:
                continue
            urls_list.append(URLResponse(
                short_code=short_code,
                short_url=f"{settings.BASE_DOMAIN}/{short_code}",
                long_url=item["long_url"],
                clicks_count=item.get("clicks_count") if item.get("clicks_count") is not None else 0,
                qr_code_url=f"{settings.BASE_DOMAIN}/api/v1/qrcode/{short_code}"
            ))
        return urls_list
    except Exception as e:
        raise handle_database_error(e, "Failed to retrieve URL history")


@router.get("/api/v1/analytics/{short_code}", response_model=AnalyticsResponse, tags=["Analytics"])
async def get_analytics(
    short_code: str, 
    user_id: Optional[str] = Depends(get_optional_user_id)
):
    """
    Returns aggregated click analytics for a given short_code.
    Anonymous links are accessible without a token; user-owned links require owner auth.
    """
    # Lấy thông tin URL từ short_code trực tiếp
    url_resp = supabase.table("urls").select("id, user_id, clicks_count").eq("short_code", short_code).execute()
    if not url_resp.data:
        raise HTTPException(status_code=404, detail="Shortened link not found.")

    url_row = url_resp.data[0]
    db_id = url_row["id"]
    url_user_id = url_row.get("user_id")
    total_clicks = url_row.get("clicks_count") if url_row.get("clicks_count") is not None else 0

    # Nếu URL có chủ sở hữu, yêu cầu xác thực đúng chủ
    if url_user_id:
        if not user_id or user_id != url_user_id:
            raise HTTPException(status_code=403, detail="You do not have permission to view analytics for this link.")

    # Lấy clicks
    clicks_resp = (
        supabase.table("clicks")
        .select("clicked_at, referrer, country, device, browser")
        .eq("url_id", db_id)
        .order("clicked_at", desc=True)
        .limit(5000)  # cap for performance
        .execute()
    )
    clicks = clicks_resp.data or []

    # --- Clicks hôm nay ---
    today_str = date.today().isoformat()
    clicks_today = sum(
        1 for c in clicks
        if (c.get("clicked_at") or "").startswith(today_str)
    )

    # --- Thống kê gom nhóm ---
    def top_items(field: str, n: int = 5) -> List[TopItem]:
        counter = Counter(c.get(field) or "Unknown" for c in clicks)
        return [TopItem(label=label, count=cnt) for label, cnt in counter.most_common(n)]

    top_referrers = top_items("referrer")
    top_countries = top_items("country")
    top_devices   = top_items("device")
    top_browsers  = top_items("browser")

    # --- Thống kê 7 ngày qua ---
    daily_map: dict[str, int] = {}
    for i in range(6, -1, -1):
        day = (date.today() - timedelta(days=i)).isoformat()
        daily_map[day] = 0
    for c in clicks:
        clicked_at = c.get("clicked_at") or ""
        day = clicked_at[:10] if clicked_at else ""
        if day in daily_map:
            daily_map[day] += 1
    daily_clicks = [DailyClick(date=d, count=cnt) for d, cnt in daily_map.items()]

    return AnalyticsResponse(
        short_code=short_code,
        total_clicks=total_clicks,
        clicks_today=clicks_today,
        top_referrers=top_referrers,
        top_countries=top_countries,
        top_devices=top_devices,
        top_browsers=top_browsers,
        daily_clicks=daily_clicks,
    )


@router.get("/api/v1/qrcode/{short_code}", tags=["URL Shortener"])
async def get_qrcode(short_code: str):
    """Sinh mã QR cho short_code và trả về file ảnh PNG trực tiếp"""
    # 1. Kiểm tra sự tồn tại trong DB
    url_resp = supabase.table("urls").select("id").eq("short_code", short_code).execute()
    if not url_resp.data:
        raise HTTPException(status_code=404, detail="Shortened link not found.")
            
    # 2. Sinh mã QR
    target_url = f"{settings.BASE_DOMAIN}/{short_code}"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(target_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Lưu vào buffer bộ nhớ
    buf = io.BytesIO()
    img.save(buf, format="PNG")  # type: ignore
    buf.seek(0)

    
    return StreamingResponse(buf, media_type="image/png")


# ──────────────────────────────────────────────────────────────
# Developer API Keys Routes
# ──────────────────────────────────────────────────────────────

@router.post("/api/v1/api-keys", response_model=APIKeyResponse, tags=["API Keys"])
async def create_api_key(
    payload: APIKeyCreate,
    user_id: str = Depends(get_current_user_id)
):
    """Tạo API Key mới cho lập trình viên"""
    new_key = generate_new_api_key()
    insert_data = {
        "key_value": new_key,
        "user_id": user_id,
        "name": payload.name,
        "is_active": True
    }
    try:
        response = supabase.table("api_keys").insert(insert_data).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create API Key.")
        
        row = response.data[0]
        return APIKeyResponse(
            id=row["id"],
            key_value=row["key_value"],
            name=row["name"],
            is_active=row["is_active"],
            created_at=str(row["created_at"])
        )
    except Exception as e:
        raise handle_database_error(e, "Failed to create API Key")


@router.get("/api/v1/api-keys", response_model=List[APIKeyResponse], tags=["API Keys"])
async def list_api_keys(
    user_id: str = Depends(get_current_user_id)
):
    """Liệt kê toàn bộ API Key của người dùng"""
    try:
        response = supabase.table("api_keys").select("*").eq("user_id", user_id).execute()
        keys_list = []
        for row in response.data:
            keys_list.append(APIKeyResponse(
                id=row["id"],
                key_value=row["key_value"],
                name=row["name"],
                is_active=row["is_active"],
                created_at=str(row["created_at"])
            ))
        return keys_list
    except Exception as e:
        raise handle_database_error(e, "Failed to list API Keys")


@router.delete("/api/v1/api-keys/{key_id}", tags=["API Keys"])
async def delete_api_key(
    key_id: int,
    user_id: str = Depends(get_current_user_id)
):
    """Xóa API Key"""
    try:
        # Kiểm tra quyền sở hữu
        res = supabase.table("api_keys").select("user_id").eq("id", key_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="API Key does not exist.")
        if res.data[0]["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="You do not have permission to delete this API Key.")
            
        supabase.table("api_keys").delete().eq("id", key_id).execute()
        return {"status": "ok", "message": "API Key deleted successfully."}
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        raise handle_database_error(e, "Failed to delete API Key")


# ──────────────────────────────────────────────────────────────
# Short Code Redirect Route
# ──────────────────────────────────────────────────────────────

@router.get("/{short_code}", tags=["URL Shortener"])
@limiter.limit("120/minute")
async def redirect_url(
    short_code: str, 
    request: Request, 
    background_tasks: BackgroundTasks
):
    if short_code in RESERVED_ALIASES:
        raise HTTPException(status_code=404, detail="URL not found.")

    try:
        # Lấy thông tin long_url và db_id bằng query short_code trực tiếp
        response = supabase.table("urls").select("id, long_url").eq("short_code", short_code).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Shortened link not found.")

        db_id = response.data[0]["id"]
        long_url = response.data[0]["long_url"]

        # Ghi nhận log click chạy ngầm
        click_data = _extract_click_info(request, db_id)
        background_tasks.add_task(_log_click, db_id, click_data)

        return RedirectResponse(url=long_url, status_code=301)
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        raise handle_database_error(e, "Failed to redirect URL")