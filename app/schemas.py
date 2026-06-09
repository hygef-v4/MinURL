from pydantic import HttpUrl
from pydantic import BaseModel

class URLRequest(BaseModel):
    long_url : HttpUrl

class URLResponse(BaseModel):
    short_code: str 
    short_url: str 
    long_url: str
    