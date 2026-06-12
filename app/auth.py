import secrets
from typing import Optional
from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials
from app.database import supabase
from app.config import logger

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
security_jwt = HTTPBearer(auto_error=False)

def generate_new_api_key() -> str:
    """Sinh một API Key ngẫu nhiên với tiền tố 'minurl_'"""
    return f"minurl_{secrets.token_urlsafe(32)}"

async def get_current_user_id(
    api_key: Optional[str] = Security(api_key_header),
    jwt_token: Optional[HTTPAuthorizationCredentials] = Security(security_jwt)
) -> str:
    """
    Dependency lấy user_id từ JWT hoặc API Key.
    Nếu không truyền gì hoặc không hợp lệ, ném lỗi 401.
    """
    # 1. Kiểm tra JWT Token trước
    if jwt_token:
        try:
            user_resp = supabase.auth.get_user(jwt_token.credentials)
            if user_resp and user_resp.user:
                return user_resp.user.id
        except Exception as e:
            logger.warning(f"JWT Auth failed: {e}")

    # 2. Kiểm tra API Key nếu không có JWT
    if api_key:
        try:
            # Query từ bảng api_keys
            res = supabase.table("api_keys").select("user_id, is_active").eq("key_value", api_key).execute()
            if res.data and res.data[0].get("is_active"):
                return res.data[0]["user_id"]
        except Exception as e:
            logger.error(f"API Key Auth database error: {e}")
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication credentials."
    )

async def get_optional_user_id(
    api_key: Optional[str] = Security(api_key_header),
    jwt_token: Optional[HTTPAuthorizationCredentials] = Security(security_jwt)
) -> Optional[str]:
    """Dependency lấy user_id tùy chọn (không bắt buộc đăng nhập)"""
    try:
        return await get_current_user_id(api_key, jwt_token)
    except HTTPException:
        return None
