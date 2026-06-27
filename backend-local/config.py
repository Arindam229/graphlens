import os
from dotenv import load_dotenv

load_dotenv()

CLOUD_API            = os.getenv("CLOUD_API", "http://localhost:8000")
OPENROUTER_API_KEY   = os.getenv("OPENROUTER_API_KEY", "")
GEMINI_API_KEY       = os.getenv("GEMINI_API_KEY", "")  # fallback if OpenRouter not set
GITHUB_CLIENT_ID     = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")