from pydantic import HttpUrl, BaseModel
from typing import List

class URLRequest(BaseModel):
    long_url: HttpUrl

class URLResponse(BaseModel):
    short_code: str
    short_url: str
    long_url: str
    clicks_count: int = 0

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