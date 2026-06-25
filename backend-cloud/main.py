from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from database import engine
from models import Base
from sqlalchemy.orm import Session
from database import get_db
from models import Analysis
from schemas import HistoryCreate

app = FastAPI()
Base.metadata.create_all(bind=engine)
security = HTTPBearer()

def verify_clerk_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    # Placeholder for Clerk JWT verification
    # In production, use python-jose to decode and verify against Clerk JWKS
    if not token:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return {"user_id": "placeholder_user_id"}

@app.get("/")
def read_root():
    return {"service": "graphlens-cloud-api", "status": "running"}

@app.post("/api/history")
def save_history(
    data: HistoryCreate,
    user: dict = Depends(verify_clerk_token),
    db: Session = Depends(get_db)
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
        "id": str(analysis.id)
    }

@app.get("/api/history")
def get_history(
    user: dict = Depends(verify_clerk_token),
    db: Session = Depends(get_db)
):
    rows = (
        db.query(Analysis)
        .filter(Analysis.user_id == user["user_id"])
        .order_by(Analysis.analyzed_at.desc())
        .all()
    )

    return {
        "status": "success",
        "history": [
            {
                "id": str(r.id),
                "repo": r.repo,
                "type": r.type,
                "language": r.language,
                "dep_count": r.dep_count,
                "circular_count": r.circular_count,
                "analyzed_at": r.analyzed_at,
            }
            for r in rows
        ]
    }
