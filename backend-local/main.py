from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from analyzer import analyze_local_repo, analyze_github_repo

app = FastAPI()


# ---------- REQUEST MODEL ----------
class AnalyzeRequest(BaseModel):
    type: str  # "github" or "local"
    url: str | None = None
    path: str | None = None


# ---------- HEALTH ----------
@app.get("/")
def root():
    return {
        "service": "graphlens-local",
        "status": "running"
    }


# ---------- ANALYZE ENDPOINT ----------
@app.post("/api/analyze")
def analyze(req: AnalyzeRequest):

    if req.type == "github":

        if not req.url:
            raise HTTPException(
                status_code=400,
                detail="URL is required for GitHub analysis"
            )

        return analyze_github_repo(req.url)

    elif req.type == "local":

        if not req.path:
            raise HTTPException(
                status_code=400,
                detail="Path is required for local analysis"
            )

        return analyze_local_repo(req.path)

    raise HTTPException(
        status_code=400,
        detail="Invalid analysis type"
    )