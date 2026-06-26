from fastapi import FastAPI, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import engine, get_db
from models import Base, Analysis
from schemas import HistoryCreate
import hashlib


app = FastAPI()

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

security = HTTPBearer(auto_error=False)


# ---------------- AUTH (DEV MODE) ----------------
def verify_clerk_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Development authentication.

    If no Clerk token is supplied, use a deterministic
    development user.

    If a token is supplied, derive a unique user id from it.
    """

    if not credentials or not credentials.credentials:
        return {
            "user_id": "dev_local_user"
        }

    token = credentials.credentials

    user_hash = hashlib.sha256(
        token.encode()
    ).hexdigest()[:16]

    return {
        "user_id": f"dev_{user_hash}"
    }


# ---------------- ROOT ----------------
@app.get("/")
def read_root():
    return {
        "service": "graphlens-cloud-api",
        "status": "running",
    }


# ---------------- SAVE HISTORY ----------------
@app.post("/api/history")
def create_history(
    data: HistoryCreate,
    user: dict = Depends(verify_clerk_token),
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
    )

    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return {
        "status": "success",
        "id": str(analysis.id),
    }


# ---------------- GET HISTORY ----------------
@app.get("/api/history")
def read_history(
    repo: str,
    user: dict = Depends(verify_clerk_token),
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
        return {
            "history": None
        }

    return {
        "history": {
            "graph": history.graph,
            "meta": {
                "repo": history.repo,
                "type": history.type,
                "language": history.language,
                "dep_count": history.dep_count,
                "circular_count": history.circular_count,
                "analyzed_at": history.analyzed_at,
            },
        }
    }