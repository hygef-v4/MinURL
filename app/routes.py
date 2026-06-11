from typing import Optional, List
from datetime import date, timedelta
from collections import Counter

from fastapi import APIRouter, HTTPException, Header, Request, BackgroundTasks
from fastapi.responses import RedirectResponse
from postgrest.exceptions import APIError
from user_agents import parse as ua_parse

from app.utils import encode_base62, decode_base62
from app.database import supabase
from app.schemas import URLRequest, URLResponse, AnalyticsResponse, TopItem, DailyClick
from app.config import settings, logger

router = APIRouter()


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
        # Requires a SQL function in Supabase:
        #   CREATE OR REPLACE FUNCTION increment_clicks(row_id bigint)
        #   RETURNS void LANGUAGE sql AS $$
        #     UPDATE urls SET clicks_count = clicks_count + 1 WHERE id = row_id;
        #   $$;
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
def shorten_url(request: URLRequest, authorization: Optional[str] = Header(None)):
    try:
        url_string = str(request.long_url)

        user_id = None
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ")[1]
            try:
                user_resp = supabase.auth.get_user(token)
                if user_resp and user_resp.user:
                    user_id = user_resp.user.id
            except Exception as auth_err:
                logger.warning(f"Token verification failed: {str(auth_err)}")

        insert_data = {"long_url": url_string}
        if user_id:
            insert_data["user_id"] = user_id

        response = supabase.table("urls").insert(insert_data).execute()
        if not response.data:
            logger.error("Supabase error: No data returned on insert.")
            raise HTTPException(status_code=500, detail="Unable to save URL.")

        db_id = response.data[0]["id"]
        short_code = encode_base62(db_id)

        supabase.table("urls").update({"short_code": short_code}).eq("id", db_id).execute()

        return URLResponse(
            short_code=short_code,
            short_url=f"{settings.BASE_DOMAIN}/{short_code}",
            long_url=url_string,
        )
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        raise handle_database_error(e, "Unable to shorten URL")


@router.get("/api/v1/history", response_model=List[URLResponse], tags=["URL Shortener"])
def get_user_history(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header.")

    token = authorization.split(" ")[1]
    try:
        user_resp = supabase.auth.get_user(token)
        if not user_resp or not user_resp.user:
            raise HTTPException(status_code=401, detail="Invalid token.")
        user_id = user_resp.user.id
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token verification failed in history endpoint: {str(e)}")
        raise HTTPException(status_code=401, detail="Token is invalid or has expired.")

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
            ))
        return urls_list
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        raise handle_database_error(e, "Unable to retrieve URL history")


@router.get("/api/v1/analytics/{short_code}", response_model=AnalyticsResponse, tags=["Analytics"])
def get_analytics(short_code: str, authorization: Optional[str] = Header(None)):
    """
    Returns aggregated click analytics for a given short_code.
    Anonymous links are accessible without a token; user-owned links require owner auth.
    """
    # Decode short_code → db row id
    try:
        db_id = decode_base62(short_code)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid URL format.")

    # Fetch URL record to verify existence + optionally check ownership
    url_resp = supabase.table("urls").select("id, user_id, clicks_count").eq("id", db_id).execute()
    if not url_resp.data:
        raise HTTPException(status_code=404, detail="Short URL not found.")

    url_row = url_resp.data[0]
    url_user_id = url_row.get("user_id")
    total_clicks = url_row.get("clicks_count") if url_row.get("clicks_count") is not None else 0

    # If URL belongs to a user, require that user's auth token
    if url_user_id:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authentication required to view analytics.")
        token = authorization.split(" ")[1]
        try:
            user_resp = supabase.auth.get_user(token)
            if not user_resp or not user_resp.user or user_resp.user.id != url_user_id:
                raise HTTPException(status_code=403, detail="You don't have access to this URL's analytics.")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=401, detail="Token is invalid or has expired.")

    # Fetch click records
    clicks_resp = (
        supabase.table("clicks")
        .select("clicked_at, referrer, country, device, browser")
        .eq("url_id", db_id)
        .order("clicked_at", desc=True)
        .limit(5000)  # cap for performance
        .execute()
    )
    clicks = clicks_resp.data or []

    # --- Today's clicks ---
    today_str = date.today().isoformat()
    clicks_today = sum(
        1 for c in clicks
        if (c.get("clicked_at") or "").startswith(today_str)
    )

    # --- Aggregations ---
    def top_items(field: str, n: int = 5) -> List[TopItem]:
        counter = Counter(c.get(field) or "Unknown" for c in clicks)
        return [TopItem(label=label, count=cnt) for label, cnt in counter.most_common(n)]

    top_referrers = top_items("referrer")
    top_countries = top_items("country")
    top_devices   = top_items("device")
    top_browsers  = top_items("browser")

    # --- Daily clicks for last 7 days ---
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


@router.get("/{short_code}", tags=["URL Shortener"])
def redirect_url(short_code: str, request: Request, background_tasks: BackgroundTasks):
    if short_code in ("favicon.ico", "robots.txt", "api"):
        raise HTTPException(status_code=404, detail="URL not found.")

    try:
        db_id = decode_base62(short_code)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid URL format.")

    try:
        response = supabase.table("urls").select("long_url").eq("id", db_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="URL not found.")

        long_url = response.data[0]["long_url"]

        # Schedule click logging as a background task so redirect is instant
        click_data = _extract_click_info(request, db_id)
        background_tasks.add_task(_log_click, db_id, click_data)

        return RedirectResponse(url=long_url, status_code=301)
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        raise handle_database_error(e, "Unable to redirect URL")