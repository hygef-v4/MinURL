from fastapi.responses import RedirectResponse
from app.utils import encode_base62, decode_base62
from app import config
from fastapi import HTTPException
from app.database import supabase
from app.schemas import URLRequest
from app.schemas import URLResponse
from fastapi import APIRouter
from app.config import logger


router = APIRouter()

@router.get ("/health", tags=["Health Check"])
def health_check():
    return {"status":"ok", "message":"API is healthy"}

from typing import Optional
from fastapi import Header

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
                logger.warning(f"Xác thực token thất bại: {str(auth_err)}")

        insert_data = {"long_url": url_string}
        if user_id:
            insert_data["user_id"] = user_id

        response = supabase.table("urls").insert(insert_data).execute()
        if not response.data:
            logger.error("Lỗi Supabase không trả về data khi insert.")
            raise HTTPException(status_code=500, detail="Không thể lưu URL.")

        db_id = response.data[0]['id']
        short_code = encode_base62(db_id)
        
        supabase.table("urls").update({"short_code":short_code}).eq("id",db_id).execute()
        
        return URLResponse(
            short_code=short_code,
            short_url=f"{config.BASE_DOMAIN}/{short_code}",
            long_url=url_string
        )
    except Exception as e:
        logger.error(f"Lỗi khi rút ngắn URL: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Không thể rút ngắn URL.")

from typing import List

@router.get("/api/v1/history", response_model=List[URLResponse], tags=["URL Shortener"])
def get_user_history(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Thiếu hoặc sai định dạng Authorization header.")

    token = authorization.split(" ")[1]
    try:
        user_resp = supabase.auth.get_user(token)
        if not user_resp or not user_resp.user:
            raise HTTPException(status_code=401, detail="Token không hợp lệ.")
        user_id = user_resp.user.id
    except Exception as e:
        logger.error(f"Xác thực token thất bại trong history endpoint: {str(e)}")
        raise HTTPException(status_code=401, detail="Token không hợp lệ hoặc đã hết hạn.")

    try:
        response = supabase.table("urls").select("short_code, long_url").eq("user_id", user_id).order("id", desc=True).limit(20).execute()
        urls_list = []
        for item in response.data:
            short_code = item["short_code"]
            urls_list.append(URLResponse(
                short_code=short_code,
                short_url=f"{config.BASE_DOMAIN}/{short_code}",
                long_url=item["long_url"]
            ))
        return urls_list
    except Exception as e:
        logger.error(f"Lỗi khi lấy lịch sử URL: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Không thể lấy lịch sử URL.")

@router.get("/{short_code}", tags=["URL Shortener"])
def redirect_url(short_code: str):
    if short_code in ["favicon.ico", "robots.txt", "api"]:
        raise HTTPException(status_code=404, detail="Không tìm thấy URL.")
    
    try:
        db_id = decode_base62(short_code)
    except ValueError:
        raise HTTPException(status_code=400, detail="URL không hợp lệ.")
    
    try:
        response = supabase.table("urls").select("long_url").eq("id", db_id).execute()
        if not response.data:
            raise HTTPException(status_code = 404, detail = "Không tìm thấy URL")
        
        return RedirectResponse(url=response.data[0]["long_url"], status_code = 301)
    except Exception as e:
        logger.error(f"Lỗi khi chuyển hướng URL: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Không thể chuyển hướng URL.")
        
        
        
    

        