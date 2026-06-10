import sys
import os

# Thêm thư mục gốc vào sys.path để Python tìm thấy package 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
