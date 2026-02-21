from sqlalchemy import Column, BigInteger, Text, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class UserProgress(Base):
    __tablename__ = "user_progress"

    id           = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id      = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    exercise_id  = Column(BigInteger, ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False)
    status       = Column(Text, nullable=False, default="in_progress")
    attempts     = Column(Integer, nullable=False, default=0)
    xp_earned    = Column(Integer, nullable=False, default=0)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at   = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at   = Column(DateTime(timezone=True), nullable=False, default=func.now())

    user     = relationship("User", back_populates="progress")
    exercise = relationship("Exercise", back_populates="progress")


class Achievement(Base):
    __tablename__ = "achievements"

    id          = Column(BigInteger, primary_key=True, autoincrement=True)
    code        = Column(Text, nullable=False, unique=True)
    title       = Column(Text, nullable=False)
    description = Column(Text, nullable=False, default="")
    icon        = Column(Text, nullable=False, default="")
    created_at  = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at  = Column(DateTime(timezone=True), nullable=False, default=func.now())

    user_achievements = relationship("UserAchievement", back_populates="achievement")


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    user_id        = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    achievement_id = Column(BigInteger, ForeignKey("achievements.id", ondelete="CASCADE"), primary_key=True)
    earned_at      = Column(DateTime(timezone=True), nullable=False, default=func.now())

    user        = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement", back_populates="user_achievements")


class Event(Base):
    __tablename__ = "events"

    id         = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id    = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    type       = Column(Text, nullable=False)
    payload    = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())

    user = relationship("User", back_populates="events")