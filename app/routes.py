from typing import Optional, List
from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import RedirectResponse
from postgrest.exceptions import APIError

from app.utils import encode_base62, decode_base62
from app.database import supabase
from app.schemas import URLRequest, URLResponse
from app.config import settings, logger

router = APIRouter()

def handle_database_error(e: Exception, context_msg: str) -> HTTPException:
    """Centralized database exception handler to map Postgrest errors to HTTP status codes."""
    if isinstance(e, APIError):
        logger.error(f"{context_msg} (APIError): message={e.message}, code={e.code}, details={e.details}", exc_info=True)
        if e.code == "23505":  # Unique key violation
            return HTTPException(status_code=409, detail="Data already exists (duplicate entry).")
        elif e.code == "23503":  # Foreign key violation
            return HTTPException(status_code=400, detail="Invalid relational reference.")
        elif e.code == "22P02":  # Invalid input representation
            return HTTPException(status_code=400, detail="Invalid input parameter format.")
        else:
            return HTTPException(status_code=400, detail=f"Database query error: {e.message}")
    else:
        logger.error(f"{context_msg} (General Error): {str(e)}", exc_info=True)
        return HTTPException(status_code=500, detail=f"{context_msg}: {str(e)}")

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

        db_id = response.data[0]['id']
        short_code = encode_base62(db_id)
        
        supabase.table("urls").update({"short_code": short_code}).eq("id", db_id).execute()
        
        return URLResponse(
            short_code=short_code,
            short_url=f"{settings.BASE_DOMAIN}/{short_code}",
            long_url=url_string
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
    except Exception as e:
        logger.error(f"Token verification failed in history endpoint: {str(e)}")
        raise HTTPException(status_code=401, detail="Token is invalid or has expired.")

    try:
        response = supabase.table("urls").select("short_code, long_url").eq("user_id", user_id).order("id", desc=True).limit(20).execute()
        urls_list = []
        for item in response.data:
            short_code = item["short_code"]
            urls_list.append(URLResponse(
                short_code=short_code,
                short_url=f"{settings.BASE_DOMAIN}/{short_code}",
                long_url=item["long_url"]
            ))
        return urls_list
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        raise handle_database_error(e, "Unable to retrieve URL history")

@router.get("/{short_code}", tags=["URL Shortener"])
def redirect_url(short_code: str):
    if short_code in ["favicon.ico", "robots.txt", "api"]:
        raise HTTPException(status_code=404, detail="URL not found.")
    
    try:
        db_id = decode_base62(short_code)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid URL format.")
    
    try:
        response = supabase.table("urls").select("long_url").eq("id", db_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="URL not found")
        
        return RedirectResponse(url=response.data[0]["long_url"], status_code=301)
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        raise handle_database_error(e, "Unable to redirect URL")