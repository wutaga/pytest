from sqlalchemy import Column, BigInteger, Text, Boolean, Integer, ForeignKey, Numeric, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Course(Base):
    __tablename__ = "courses"

    id           = Column(BigInteger, primary_key=True, autoincrement=True)
    title        = Column(Text, nullable=False)
    slug         = Column(Text, nullable=False, unique=True)
    description  = Column(Text, nullable=False, default="")
    price        = Column(Numeric(10, 2), nullable=False, default=0)
    is_published = Column(Boolean, nullable=False, default=False)
    deleted_at   = Column(DateTime(timezone=True), nullable=True)
    created_at   = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at   = Column(DateTime(timezone=True), nullable=False, default=func.now())

    modules   = relationship("Module", back_populates="course")
    purchases = relationship("CoursePurchase", back_populates="course")


class Module(Base):
    __tablename__ = "modules"

    id          = Column(BigInteger, primary_key=True, autoincrement=True)
    course_id   = Column(BigInteger, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    title       = Column(Text, nullable=False)
    order_index = Column(Integer, nullable=False, default=0)
    is_free     = Column(Boolean, nullable=False, default=False)
    deleted_at  = Column(DateTime(timezone=True), nullable=True)
    created_at  = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at  = Column(DateTime(timezone=True), nullable=False, default=func.now())

    course  = relationship("Course", back_populates="modules")
    lessons = relationship("Lesson", back_populates="module")


class Lesson(Base):
    __tablename__ = "lessons"

    id          = Column(BigInteger, primary_key=True, autoincrement=True)
    module_id   = Column(BigInteger, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False)
    title       = Column(Text, nullable=False)
    order_index = Column(Integer, nullable=False, default=0)
    theory      = Column(JSONB, nullable=False, default=list)
    xp_reward   = Column(Integer, nullable=False, default=10)
    deleted_at  = Column(DateTime(timezone=True), nullable=True)
    created_at  = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at  = Column(DateTime(timezone=True), nullable=False, default=func.now())

    module    = relationship("Module", back_populates="lessons")
    exercises = relationship("Exercise", back_populates="lesson")


class Exercise(Base):
    __tablename__ = "exercises"

    id          = Column(BigInteger, primary_key=True, autoincrement=True)
    lesson_id   = Column(BigInteger, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    order_index = Column(Integer, nullable=False, default=0)
    type        = Column(Text, nullable=False)
    content     = Column(JSONB, nullable=False, default=dict)
    xp_reward   = Column(Integer, nullable=False, default=10)
    deleted_at  = Column(DateTime(timezone=True), nullable=True)
    created_at  = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at  = Column(DateTime(timezone=True), nullable=False, default=func.now())

    lesson   = relationship("Lesson", back_populates="exercises")
    progress = relationship("UserProgress", back_populates="exercise")