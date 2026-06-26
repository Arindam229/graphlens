import os
from dotenv import load_dotenv

load_dotenv()

CLOUD_API = os.getenv(
    "CLOUD_API",
    "http://localhost:8000"
)