from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Boolean, ForeignKey, DateTime, Text,
    UniqueConstraint,
)
from geoalchemy2 import Geometry
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, default="")
    age = Column(Integer, nullable=True)
    bio = Column(String(500), nullable=True, default="")
    location = Column(Geometry(geometry_type="POINT", srid=4326), nullable=True)
    share_in_range = Column(Boolean, default=False)


class FriendRequest(Base):
    __tablename__ = "friend_requests"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Friendship(Base):
    __tablename__ = "friendships"
    __table_args__ = (
        UniqueConstraint("user_id_1", "user_id_2", name="uq_friendship_pair"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id_1 = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_id_2 = Column(Integer, ForeignKey("users.id"), nullable=False)


class Thread(Base):
    __tablename__ = "threads"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ThreadParticipant(Base):
    __tablename__ = "thread_participants"
    __table_args__ = (
        UniqueConstraint("thread_id", "user_id", name="uq_thread_user"),
    )

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("threads.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("threads.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
