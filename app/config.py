import logging
import os
from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

class Settings(BaseModel):
    SUPABASE_URL: str
    SUPABASE_KEY: str
    BASE_DOMAIN: str = Field(default="http://localhost:8000")
    SAFE_BROWSING_API_KEY: str = Field(default="")

try:
    settings = Settings(
        SUPABASE_URL=os.getenv('SUPABASE_URL', ''),
        SUPABASE_KEY=os.getenv('SUPABASE_KEY', ''),
        BASE_DOMAIN=os.getenv('BASE_DOMAIN', 'http://localhost:8000').rstrip('/'),
        SAFE_BROWSING_API_KEY=os.getenv('SAFE_BROWSING_API_KEY', ''),
    )

except Exception as e:
    logger.error("Environment variables configuration error! Please check your .env file or system settings.")
    raise e