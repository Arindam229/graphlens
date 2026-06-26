from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from analyzer import (
    analyze_local_repo,
    analyze_github_repo,
)

from cloud import (
    check_history,
    save_history,
)

app = FastAPI()


# ---------- REQUEST MODEL ----------
class AnalyzeRequest(BaseModel):
    type: str          # "github" or "local"
    url: str | None = None
    path: str | None = None
    token: str | None = None   # optional for now


# ---------- HEALTH ----------
@app.get("/")
def root():
    return {
        "service": "graphlens-local",
        "status": "running"
    }


# ---------- ANALYZE ----------
@app.post("/api/analyze")
def analyze(req: AnalyzeRequest):

    # Determine repository identifier
    if req.type == "github":
        if not req.url:
            raise HTTPException(
                status_code=400,
                detail="GitHub URL is required."
            )
        repo = req.url

    elif req.type == "local":
        if not req.path:
            raise HTTPException(
                status_code=400,
                detail="Local path is required."
            )
        repo = req.path

    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid analysis type."
        )

    # -------------------------------
    # Step 1: Check cache in cloud
    # -------------------------------
    cached = check_history(repo, req.token)

    if cached.get("history") is not None:
        return {
            "status": "success",
            "cached": True,
            "graph": cached["history"]["graph"],
            "meta": cached["history"]["meta"],
        }

    # -------------------------------
    # Step 2: Analyze repository
    # -------------------------------
    if req.type == "github":
        result = analyze_github_repo(
            req.url,
            req.token,
        )
    else:
        result = analyze_local_repo(
            req.path,
        )

    if result["status"] != "success":
        return result

    # -------------------------------
    # Step 3: Save to cloud
    # -------------------------------
    save_history(
        {
            "repo": repo,
            "type": req.type,
            "language": result["meta"]["language"],
            "graph": result["graph"],
            "dep_count": result["meta"]["dep_count"],
            "circular_count": result["meta"]["circular_count"],
        },
        req.token,
    )

    # -------------------------------
    # Step 4: Return fresh analysis
    # -------------------------------
    return result