from h11._abnf import status_code
from fastapi.responses import RedirectResponse
from multiprocessing.sharedctypes import Value
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

@router.post("/api/v1/,shorten", response_model=URLResponse, tags=["URL Shortener"])
def shorten_url(request: URLRequest):    
    try:
        url_string = str(request.long_url)

        response = supabase.table("urls").insert({"long_url": url_string}).execute()
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
        
        
        
    

        