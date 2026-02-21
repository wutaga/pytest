from sqlalchemy import Column, BigInteger, Text, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database import Base

class Course(Base):
    __tablename__ = "courses"
    id       = Column(BigInteger, primary_key=True, autoincrement=True)
    title    = Column(Text, nullable=False)
    slug     = Column(Text, nullable=False, unique=True)
    modules  = relationship("Module", back_populates="course")

class Module(Base):
    __tablename__ = "modules"
    id        = Column(BigInteger, primary_key=True, autoincrement=True)
    course_id = Column(BigInteger, ForeignKey("courses.id"), nullable=False)
    title     = Column(Text, nullable=False)
    is_free   = Column(Boolean, default=True)
    lessons   = relationship("Lesson", back_populates="module")
    course    = relationship("Course", back_populates="modules")

class Lesson(Base):
    __tablename__ = "lessons"
    id        = Column(BigInteger, primary_key=True, autoincrement=True)
    module_id = Column(BigInteger, ForeignKey("modules.id"), nullable=False)
    title     = Column(Text, nullable=False)
    theory    = Column(JSONB, nullable=False, default=list)
    exercises = relationship("Exercise", back_populates="lesson")
    module    = relationship("Module", back_populates="lessons")

class Exercise(Base):
    __tablename__ = "exercises"
    id        = Column(BigInteger, primary_key=True, autoincrement=True)
    lesson_id = Column(BigInteger, ForeignKey("lessons.id"), nullable=False)
    type      = Column(Text, nullable=False)
    content   = Column(JSONB, nullable=False)
    xp_reward = Column(Integer, default=20)
    lesson    = relationship("Lesson", back_populates="exercises")