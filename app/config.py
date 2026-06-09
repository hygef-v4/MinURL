import logging
import os
from dotenv import load_dotenv

load_dotenv()

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
BASE_DOMAIN = os.getenv('BASE_DOMAIN', 'http://localhost:8000'.rstrip('/'))

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error(
        "SUPABASE_URL and SUPABASE_KEY must be set in environment variables.")
    raise EnvironmentError(
        "Missing required environment variables: SUPABASE_URL and SUPABASE_KEY")