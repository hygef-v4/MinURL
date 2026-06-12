import httpx
from urllib.parse import urlparse
from app.config import settings, logger

LOCAL_BLACKLIST = {
    "malicious.com",
    "phishing-test.com",
    "bad-site.org",
    "dangerous-link.net"
}

async def check_url_safety(url: str) -> bool:
    """
    Kiểm tra URL có an toàn hay không.
    Trả về True nếu an toàn, False nếu thuộc diện độc hại.
    """
    # 1. Kiểm tra local blacklist
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        
        # Loại bỏ cổng (port) nếu có, e.g. malicious.com:8000 -> malicious.com
        if ":" in domain:
            domain = domain.split(":")[0]
            
        # Kiểm tra domain trực tiếp và các root domain
        parts = domain.split('.')
        if len(parts) >= 2:
            root_domain = ".".join(parts[-2:])
            if root_domain in LOCAL_BLACKLIST or domain in LOCAL_BLACKLIST:
                logger.warning(f"URL blocked by local blacklist: {url}")
                return False
        elif domain in LOCAL_BLACKLIST:
            logger.warning(f"URL blocked by local blacklist: {url}")
            return False
            
    except Exception as e:
        logger.error(f"Error parsing domain for safety check: {e}")

    # 2. Kiểm tra Google Safe Browsing API nếu có API Key
    if settings.SAFE_BROWSING_API_KEY:
        api_url = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={settings.SAFE_BROWSING_API_KEY}"
        payload = {
            "client": {"clientId": "minurl", "clientVersion": "1.0.0"},
            "threatInfo": {
                "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
                "platformTypes": ["ANY_PLATFORM"],
                "threatEntryTypes": ["URL"],
                "threatEntries": [{"url": url}]
            }
        }
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(api_url, json=payload, timeout=3.0)
                if res.status_code == 200:
                    data = res.json()
                    # Nếu có 'matches', nghĩa là URL không an toàn
                    if "matches" in data and len(data["matches"]) > 0:
                        logger.warning(f"URL blocked by Google Safe Browsing: {url}")
                        return False
        except Exception as e:
            logger.error(f"Google Safe Browsing API call failed: {e}")
            
    return True
