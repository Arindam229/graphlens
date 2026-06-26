from sqlalchemy.orm import Session
from models import Analysis


def save_history(db: Session, user_id: str, data):
    analysis = Analysis(
        user_id=user_id,
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

    return analysis


def get_history(db: Session, user_id: str, repo: str):
    return (
        db.query(Analysis)
        .filter(
            Analysis.user_id == user_id,
            Analysis.repo == repo,
        )
        .order_by(Analysis.analyzed_at.desc())
        .first()
    )