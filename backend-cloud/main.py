import math
import httpx

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import engine, get_db
from models import Base, Analysis
from schemas import HistoryCreate


app = FastAPI()

Base.metadata.create_all(bind=engine)

# Add new columns to existing DB if not present (idempotent migration)
with engine.connect() as conn:
    for col, ddl in [
        ("entry_points", "ALTER TABLE analyses ADD COLUMN IF NOT EXISTS entry_points JSONB"),
        ("repo_summary",  "ALTER TABLE analyses ADD COLUMN IF NOT EXISTS repo_summary TEXT"),
    ]:
        try:
            conn.execute(text(ddl))
            conn.commit()
        except Exception:
            conn.rollback()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8001",
        "tauri://localhost",
        "https://tauri.localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)

_gh_user_cache: dict[str, str] = {}  # token → github_user_id


def verify_github_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    if not credentials or not credentials.credentials:
        return {"user_id": "anonymous"}

    token = credentials.credentials

    if token in _gh_user_cache:
        return {"user_id": _gh_user_cache[token]}

    try:
        resp = httpx.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
            timeout=8,
        )
        if resp.status_code == 200:
            github_id = str(resp.json().get("id", "unknown"))
            _gh_user_cache[token] = github_id
            return {"user_id": github_id}
    except Exception:
        pass

    return {"user_id": "anonymous"}


# ---------------- ROOT ----------------
@app.get("/")
def read_root():
    return {"service": "graphlens-cloud-api", "status": "running"}


# ---------------- SAVE HISTORY ----------------
@app.post("/api/history")
def create_history(
    data: HistoryCreate,
    user: dict = Depends(verify_github_token),
    db: Session = Depends(get_db),
):
    analysis = Analysis(
        user_id=user["user_id"],
        repo=data.repo,
        type=data.type,
        language=data.language,
        graph=data.graph,
        dep_count=data.dep_count,
        circular_count=data.circular_count,
        entry_points=data.entry_points,
        repo_summary=data.repo_summary,
    )

    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return {"status": "success", "id": str(analysis.id)}


# ---------------- GET HISTORY (single repo, for cache check) ----------------
@app.get("/api/history")
def read_history(
    repo: str,
    user: dict = Depends(verify_github_token),
    db: Session = Depends(get_db),
):
    history = (
        db.query(Analysis)
        .filter(
            Analysis.user_id == user["user_id"],
            Analysis.repo == repo,
        )
        .order_by(Analysis.analyzed_at.desc())
        .first()
    )

    if history is None:
        return {"history": None}

    return {
        "history": {
            "graph": history.graph,
            "meta": {
                "repo": history.repo,
                "type": history.type,
                "language": history.language,
                "dep_count": history.dep_count,
                "circular_count": history.circular_count,
                "analyzed_at": str(history.analyzed_at),
                "entry_points": history.entry_points or [],
                "repo_summary": history.repo_summary or "",
            },
        }
    }


# ---------------- GET ALL HISTORY (paginated) ----------------
@app.get("/api/history/all")
def read_all_history(
    page: int = 1,
    limit: int = 20,
    user: dict = Depends(verify_github_token),
    db: Session = Depends(get_db),
):
    limit = max(1, min(limit, 100))
    page = max(1, page)
    offset = (page - 1) * limit

    total = (
        db.query(Analysis)
        .filter(Analysis.user_id == user["user_id"])
        .count()
    )

    rows = (
        db.query(Analysis)
        .filter(Analysis.user_id == user["user_id"])
        .order_by(Analysis.analyzed_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    items = [
        {
            "id": str(r.id),
            "repo": r.repo,
            "type": r.type,
            "language": r.language,
            "dep_count": r.dep_count,
            "circular_count": r.circular_count,
            "analyzed_at": str(r.analyzed_at),
        }
        for r in rows
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if total > 0 else 0,
    }


# ---------------- DELETE ALL HISTORY ----------------
@app.delete("/api/history/all")
def delete_all_history(
    user: dict = Depends(verify_github_token),
    db: Session = Depends(get_db),
):
    deleted = (
        db.query(Analysis)
        .filter(Analysis.user_id == user["user_id"])
        .delete()
    )
    db.commit()
    return {"status": "success", "deleted": deleted}
