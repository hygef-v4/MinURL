from pydantic import HttpUrl, BaseModel, Field
from typing import List, Optional

class URLRequest(BaseModel):
    long_url: HttpUrl
    custom_alias: Optional[str] = Field(None, min_length=3, max_length=30)

class URLResponse(BaseModel):
    short_code: str
    short_url: str
    long_url: str
    clicks_count: int = 0
    qr_code_url: Optional[str] = None

class APIKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)

class APIKeyResponse(BaseModel):
    id: int
    key_value: str
    name: str
    is_active: bool
    created_at: str

class TopItem(BaseModel):
    label: str
    count: int

class DailyClick(BaseModel):
    date: str   # ISO date string, e.g. "2024-06-11"
    count: int

class AnalyticsResponse(BaseModel):
    short_code: str
    total_clicks: int
    clicks_today: int
    top_referrers: List[TopItem]
    top_countries: List[TopItem]
    top_devices: List[TopItem]
    top_browsers: List[TopItem]
    daily_clicks: List[DailyClick]  # last 7 days
