import os
from datetime import datetime, timezone
from typing import Optional

import jwt
from jwt import PyJWKClient
from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy import or_, and_, func, cast
from sqlalchemy.orm import Session
from geoalchemy2 import Geography
from geoalchemy2.functions import ST_DWithin, ST_MakePoint, ST_SetSRID

from database import engine, get_db, Base
from models import User, FriendRequest, Friendship, Thread, ThreadParticipant, Message

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://uhfgfoiueykqlmlxnbsw.supabase.co")
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
jwks_client = PyJWKClient(JWKS_URL, cache_keys=True)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(title="Phega API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer_scheme = HTTPBearer()


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------------------------
# Auth – verify Supabase JWT and auto-register users
# ---------------------------------------------------------------------------
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials

    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(401, f"Invalid token: {e}")

    sub: str = payload.get("sub")
    if not sub:
        raise HTTPException(401, "Token missing sub claim")

    user = db.query(User).filter(User.auth_id == sub).first()
    if not user:
        email = payload.get("email", "")
        name = email.split("@")[0] if email else "New User"
        user = User(auth_id=sub, name=name, bio="")
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class LocationIn(BaseModel):
    latitude: float
    longitude: float


class DiscoverPerson(BaseModel):
    id: int
    name: str
    bio: Optional[str] = ""
    age: Optional[int] = None
    distanceKm: Optional[float] = None
    isFriend: bool = False
    inRange: bool = True


class FriendOut(BaseModel):
    id: int
    name: str
    bio: Optional[str] = ""
    age: Optional[int] = None
    isFriend: bool = True
    distanceKm: Optional[float] = None
    inRange: bool = True


class FriendRequestOut(BaseModel):
    id: int
    name: str
    bio: Optional[str] = ""


class FriendRequestIn(BaseModel):
    userId: int


class AcceptRequestIn(BaseModel):
    requestId: int


class CreateThreadIn(BaseModel):
    userId: int


class ThreadOut(BaseModel):
    id: int
    otherUser: dict
    lastText: str = ""
    lastAt: Optional[str] = None
    unreadCount: int = 0


class SendMessageIn(BaseModel):
    text: str


class MessageOut(BaseModel):
    id: int
    text: str
    isOwn: bool
    createdAt: str


# ---------------------------------------------------------------------------
# Location & Discover
# ---------------------------------------------------------------------------
@app.post("/api/users/me/location")
def update_location(
    body: LocationIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    point = func.ST_SetSRID(func.ST_MakePoint(body.longitude, body.latitude), 4326)
    current_user.location = point
    current_user.share_in_range = True
    db.commit()
    return {"ok": True}


@app.get("/api/discover", response_model=list[DiscoverPerson])
def discover(
    radius: float = Query(5, description="Radius in km"),
    minAge: int = Query(18),
    maxAge: int = Query(99),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.location is None:
        return []

    radius_m = radius * 1000

    friend_ids_q = db.query(Friendship.user_id_2).filter(
        Friendship.user_id_1 == current_user.id
    ).union(
        db.query(Friendship.user_id_1).filter(
            Friendship.user_id_2 == current_user.id
        )
    ).subquery()

    # Build a SQL-level reference to the current user's location to avoid
    # Python-side WKB hex being sent as a text literal.
    my_loc = (
        db.query(cast(User.location, Geography))
        .filter(User.id == current_user.id)
        .scalar_subquery()
    )

    q = (
        db.query(
            User,
            func.ST_Distance(
                cast(User.location, Geography), my_loc
            ).label("distance_m"),
        )
        .filter(
            User.id != current_user.id,
            User.location.isnot(None),
            User.share_in_range.is_(True),
            ST_DWithin(
                cast(User.location, Geography),
                my_loc,
                radius_m,
            ),
            ~User.id.in_(friend_ids_q),
        )
    )

    if minAge is not None:
        q = q.filter(or_(User.age.is_(None), User.age >= minAge))
    if maxAge is not None:
        q = q.filter(or_(User.age.is_(None), User.age <= maxAge))

    results = q.order_by("distance_m").all()

    return [
        DiscoverPerson(
            id=u.id,
            name=u.name,
            bio=u.bio or "",
            age=u.age,
            distanceKm=round(dist / 1000, 1) if dist else None,
            isFriend=False,
            inRange=True,
        )
        for u, dist in results
    ]


# ---------------------------------------------------------------------------
# Friends
# ---------------------------------------------------------------------------
@app.get("/api/friends", response_model=list[FriendOut])
def list_friends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(User)
        .join(
            Friendship,
            or_(
                and_(Friendship.user_id_1 == current_user.id, Friendship.user_id_2 == User.id),
                and_(Friendship.user_id_2 == current_user.id, Friendship.user_id_1 == User.id),
            ),
        )
        .all()
    )
    return [
        FriendOut(id=u.id, name=u.name, bio=u.bio or "", age=u.age)
        for u in rows
    ]


@app.get("/api/friends/requests", response_model=list[FriendRequestOut])
def list_friend_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reqs = (
        db.query(FriendRequest, User)
        .join(User, FriendRequest.sender_id == User.id)
        .filter(
            FriendRequest.receiver_id == current_user.id,
            FriendRequest.status == "pending",
        )
        .all()
    )
    return [
        FriendRequestOut(id=fr.id, name=u.name, bio=u.bio or "")
        for fr, u in reqs
    ]


@app.post("/api/friends/request")
def send_friend_request(
    body: FriendRequestIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.userId == current_user.id:
        raise HTTPException(400, "Cannot send request to yourself")

    existing = (
        db.query(FriendRequest)
        .filter(
            FriendRequest.sender_id == current_user.id,
            FriendRequest.receiver_id == body.userId,
            FriendRequest.status == "pending",
        )
        .first()
    )
    if existing:
        return {"ok": True, "id": existing.id}

    fr = FriendRequest(sender_id=current_user.id, receiver_id=body.userId)
    db.add(fr)
    db.commit()
    db.refresh(fr)
    return {"ok": True, "id": fr.id}


@app.post("/api/friends/accept")
def accept_friend_request(
    body: AcceptRequestIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fr = db.query(FriendRequest).filter(FriendRequest.id == body.requestId).first()
    if not fr:
        raise HTTPException(404, "Request not found")
    if fr.receiver_id != current_user.id:
        raise HTTPException(403, "Not your request")
    if fr.status != "pending":
        raise HTTPException(400, "Request already handled")

    fr.status = "accepted"

    uid_lo, uid_hi = sorted([fr.sender_id, fr.receiver_id])
    exists = (
        db.query(Friendship)
        .filter(Friendship.user_id_1 == uid_lo, Friendship.user_id_2 == uid_hi)
        .first()
    )
    if not exists:
        db.add(Friendship(user_id_1=uid_lo, user_id_2=uid_hi))

    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Messaging
# ---------------------------------------------------------------------------
@app.get("/api/threads", response_model=list[ThreadOut])
def list_threads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thread_ids = (
        db.query(ThreadParticipant.thread_id)
        .filter(ThreadParticipant.user_id == current_user.id)
        .subquery()
    )

    threads = db.query(Thread).filter(Thread.id.in_(thread_ids)).all()

    out = []
    for t in threads:
        other_p = (
            db.query(ThreadParticipant)
            .filter(
                ThreadParticipant.thread_id == t.id,
                ThreadParticipant.user_id != current_user.id,
            )
            .first()
        )
        other_user = {"id": "", "name": "Unknown"}
        if other_p:
            u = db.query(User).filter(User.id == other_p.user_id).first()
            if u:
                other_user = {"id": str(u.id), "name": u.name}

        last_msg = (
            db.query(Message)
            .filter(Message.thread_id == t.id)
            .order_by(Message.created_at.desc())
            .first()
        )

        out.append(
            ThreadOut(
                id=t.id,
                otherUser=other_user,
                lastText=last_msg.text if last_msg else "",
                lastAt=last_msg.created_at.isoformat() if last_msg else (
                    t.created_at.isoformat() if t.created_at else None
                ),
            )
        )

    out.sort(key=lambda x: x.lastAt or "", reverse=True)
    return out


@app.post("/api/threads")
def create_thread(
    body: CreateThreadIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uid_a, uid_b = sorted([current_user.id, body.userId])
    existing = (
        db.query(Thread)
        .join(ThreadParticipant, ThreadParticipant.thread_id == Thread.id)
        .filter(ThreadParticipant.user_id == uid_a)
        .intersect(
            db.query(Thread)
            .join(ThreadParticipant, ThreadParticipant.thread_id == Thread.id)
            .filter(ThreadParticipant.user_id == uid_b)
        )
        .first()
    )
    if existing:
        return {"id": existing.id}

    thread = Thread()
    db.add(thread)
    db.flush()

    db.add(ThreadParticipant(thread_id=thread.id, user_id=current_user.id))
    db.add(ThreadParticipant(thread_id=thread.id, user_id=body.userId))
    db.commit()
    db.refresh(thread)
    return {"id": thread.id}


@app.get("/api/threads/{thread_id}/messages", response_model=list[MessageOut])
def list_messages(
    thread_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    is_participant = (
        db.query(ThreadParticipant)
        .filter(
            ThreadParticipant.thread_id == thread_id,
            ThreadParticipant.user_id == current_user.id,
        )
        .first()
    )
    if not is_participant:
        raise HTTPException(403, "Not a participant")

    msgs = (
        db.query(Message)
        .filter(Message.thread_id == thread_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    return [
        MessageOut(
            id=m.id,
            text=m.text,
            isOwn=m.sender_id == current_user.id,
            createdAt=m.created_at.isoformat() if m.created_at else "",
        )
        for m in msgs
    ]


@app.post("/api/threads/{thread_id}/messages")
def send_message(
    thread_id: int,
    body: SendMessageIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    is_participant = (
        db.query(ThreadParticipant)
        .filter(
            ThreadParticipant.thread_id == thread_id,
            ThreadParticipant.user_id == current_user.id,
        )
        .first()
    )
    if not is_participant:
        raise HTTPException(403, "Not a participant")

    msg = Message(thread_id=thread_id, sender_id=current_user.id, text=body.text)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {
        "id": msg.id,
        "text": msg.text,
        "isOwn": True,
        "createdAt": msg.created_at.isoformat() if msg.created_at else "",
    }
