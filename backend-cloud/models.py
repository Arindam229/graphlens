import uuid

from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(String, nullable=False)

    repo = Column(String, nullable=False)

    type = Column(String, nullable=False)

    language = Column(String, nullable=False)

    graph = Column(JSONB, nullable=False)

    dep_count = Column(Integer)

    circular_count = Column(Integer, default=0)

    analyzed_at = Column(DateTime(timezone=True), server_default=func.now())