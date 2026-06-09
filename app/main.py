from app.routes import router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Khởi tạo app
app = FastAPI(
    title="MinURL API", 
    description="Hệ thống URL Shortener tốc độ cao", 
    version="1.0.0"
)

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)