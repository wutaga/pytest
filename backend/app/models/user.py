from sqlalchemy import Column, BigInteger, Text, Boolean, Integer, ForeignKey, Numeric, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(BigInteger, primary_key=True, autoincrement=True)
    email         = Column(Text, nullable=False, unique=True)
    password_hash = Column(Text, nullable=False)
    username      = Column(Text, nullable=False, unique=True)
    is_verified   = Column(Boolean, nullable=False, default=False)
    xp            = Column(Integer, nullable=False, default=0)
    level         = Column(Integer, nullable=False, default=1)
    streak_days   = Column(Integer, nullable=False, default=0)
    last_seen_at  = Column(DateTime(timezone=True), nullable=True)
    deleted_at    = Column(DateTime(timezone=True), nullable=True)
    created_at    = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at    = Column(DateTime(timezone=True), nullable=False, default=func.now())

    progress      = relationship("UserProgress", back_populates="user")
    subscriptions = relationship("Subscription", back_populates="user")
    purchases     = relationship("CoursePurchase", back_populates="user")
    achievements  = relationship("UserAchievement", back_populates="user")
    events        = relationship("Event", back_populates="user")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id         = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id    = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status     = Column(Text, nullable=False, default="active")
    plan       = Column(Text, nullable=False, default="monthly")
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, default=func.now())

    user = relationship("User", back_populates="subscriptions")


class CoursePurchase(Base):
    __tablename__ = "course_purchases"

    id          = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id     = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id   = Column(BigInteger, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    amount_paid = Column(Numeric(10, 2), nullable=False)
    created_at  = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at  = Column(DateTime(timezone=True), nullable=False, default=func.now())

    user   = relationship("User", back_populates="purchases")
    course = relationship("Course", back_populates="purchases")