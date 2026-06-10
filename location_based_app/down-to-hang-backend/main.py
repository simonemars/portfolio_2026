import logging
import os
from datetime import datetime, timezone
from typing import Optional

import jwt
from jwt import PyJWKClient
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy import or_, and_, func, text
from sqlalchemy.orm import Session
from geoalchemy2.functions import ST_DWithin

from database import engine, get_db, Base
from models import User, FriendRequest, Friendship, Thread, ThreadParticipant, Message

# ---------------------------------------------------------------------------
# Structured logging (python-json-logger, imported defensively)
# ---------------------------------------------------------------------------
logger = logging.getLogger("phega")
logger.setLevel(logging.INFO)
if not logger.handlers:
    _handler = logging.StreamHandler()
    try:
        from pythonjsonlogger import jsonlogger

        _handler.setFormatter(
            jsonlogger.JsonFormatter("%(asctime)s %(levelname)s %(name)s %(message)s")
        )
    except Exception:  # pragma: no cover - fallback if lib missing
        _handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
        )
    logger.addHandler(_handler)
logger.propagate = False

# ---------------------------------------------------------------------------
# Rate limiting (slowapi, imported defensively)
# ---------------------------------------------------------------------------
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded

    limiter = Limiter(key_func=get_remote_address)
    _SLOWAPI_AVAILABLE = True
except Exception:  # pragma: no cover - fallback if lib missing
    logger.warning("slowapi not available; rate limiting disabled")
    limiter = None
    _SLOWAPI_AVAILABLE = False

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://uhfgfoiueykqlmlxnbsw.supabase.co")
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
jwks_client = PyJWKClient(JWKS_URL, cache_keys=True)


def _no_limit(_arg=None):
    """Decorator no-op used when slowapi is unavailable."""

    def _wrap(func_):
        return func_

    # support both @limiter.limit("...") and direct decoration styles
    if callable(_arg):
        return _arg
    return _wrap


def rate_limit(spec: str):
    if _SLOWAPI_AVAILABLE:
        return limiter.limit(spec)
    return _no_limit


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(title="Phega API")

if _SLOWAPI_AVAILABLE:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS – origins from env ALLOWED_ORIGINS (comma-separated), default "*"
_origins_env = os.getenv("ALLOWED_ORIGINS")
if _origins_env:
    allowed_origins = [o.strip() for o in _origins_env.split(",") if o.strip()]
else:
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer_scheme = HTTPBearer()


@app.on_event("startup")
def on_startup():
    logger.info("Phega API starting up")
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
class DiscoverIn(BaseModel):
    latitude: float
    longitude: float
    radius_km: float = Field(default=5, ge=0.1, le=100)
    min_age: int = Field(default=18, ge=13, le=120)
    max_age: int = Field(default=99, ge=13, le=120)


class NearbyUserResponse(BaseModel):
    id: int
    name: str
    bio: Optional[str] = ""
    age: Optional[int] = None
    distanceKm: float


class MeOut(BaseModel):
    id: int
    name: str
    age: Optional[int] = None
    bio: Optional[str] = ""


class MeUpdateIn(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    age: Optional[int] = Field(default=None, ge=13, le=120)
    bio: Optional[str] = Field(default=None, max_length=500)


class PublicUserOut(BaseModel):
    id: int
    name: str
    bio: Optional[str] = ""
    age: Optional[int] = None


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


class DeclineIn(BaseModel):
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
    text: str = Field(min_length=1, max_length=500)


class MessageOut(BaseModel):
    id: int
    text: str
    isOwn: bool
    createdAt: str


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.get("/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:  # pragma: no cover - still return ok per spec
        logger.error("Health DB check failed: %s", e)
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Current user (me)
# ---------------------------------------------------------------------------
@app.get("/api/me", response_model=MeOut)
def get_me(current_user: User = Depends(get_current_user)):
    return MeOut(
        id=current_user.id,
        name=current_user.name,
        age=current_user.age,
        bio=current_user.bio or "",
    )


@app.put("/api/me", response_model=MeOut)
def update_me(
    body: MeUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.name is not None:
        current_user.name = body.name
    if body.age is not None:
        current_user.age = body.age
    if body.bio is not None:
        current_user.bio = body.bio

    db.commit()
    db.refresh(current_user)
    return MeOut(
        id=current_user.id,
        name=current_user.name,
        age=current_user.age,
        bio=current_user.bio or "",
    )


@app.get("/api/users/{user_id}", response_model=PublicUserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found")
    return PublicUserOut(id=u.id, name=u.name, bio=u.bio or "", age=u.age)


# ---------------------------------------------------------------------------
# Discover (single POST — updates caller location + returns nearby users)
# ---------------------------------------------------------------------------
@app.post("/api/discover", response_model=list[NearbyUserResponse])
@rate_limit("30/minute")
def discover(
    request: Request,
    body: DiscoverIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Update the requesting user's location (lng, lat order for PostGIS)
    my_point = func.ST_SetSRID(func.ST_MakePoint(body.longitude, body.latitude), 4326)
    current_user.location = my_point
    current_user.share_in_range = True
    db.flush()

    radius_m = body.radius_km * 1000

    # Subquery: IDs of existing friends (both directions)
    friend_ids_q = db.query(Friendship.user_id_2).filter(
        Friendship.user_id_1 == current_user.id
    ).union(
        db.query(Friendship.user_id_1).filter(
            Friendship.user_id_2 == current_user.id
        )
    ).subquery()

    # SQL-level reference to the freshly flushed location
    my_loc = (
        db.query(User.location)
        .filter(User.id == current_user.id)
        .scalar_subquery()
    )

    q = (
        db.query(
            User,
            func.ST_Distance(User.location, my_loc).label("distance_m"),
        )
        .filter(
            User.id != current_user.id,
            User.location.isnot(None),
            User.share_in_range.is_(True),
            ST_DWithin(User.location, my_loc, radius_m),
            ~User.id.in_(friend_ids_q),
        )
    )

    q = q.filter(or_(User.age.is_(None), User.age >= body.min_age))
    q = q.filter(or_(User.age.is_(None), User.age <= body.max_age))

    results = q.order_by("distance_m").all()
    db.commit()

    return [
        NearbyUserResponse(
            id=u.id,
            name=u.name,
            bio=u.bio or "",
            age=u.age,
            distanceKm=round(dist / 1000, 1) if dist else 0,
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


@app.post("/api/friends/decline")
def decline_friend_request(
    body: DeclineIn,
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

    fr.status = "declined"
    db.commit()
    return {"ok": True}


@app.delete("/api/friends/{user_id}")
def remove_friend(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uid_lo, uid_hi = sorted([current_user.id, user_id])
    friendship = (
        db.query(Friendship)
        .filter(Friendship.user_id_1 == uid_lo, Friendship.user_id_2 == uid_hi)
        .first()
    )
    if friendship:
        db.delete(friendship)
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

        unread_count = (
            db.query(func.count(Message.id))
            .filter(
                Message.thread_id == t.id,
                Message.sender_id != current_user.id,
                Message.read_at.is_(None),
            )
            .scalar()
        )

        out.append(
            ThreadOut(
                id=t.id,
                otherUser=other_user,
                lastText=last_msg.text if last_msg else "",
                lastAt=last_msg.created_at.isoformat() if last_msg else (
                    t.created_at.isoformat() if t.created_at else None
                ),
                unreadCount=unread_count or 0,
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
@rate_limit("30/minute")
def send_message(
    request: Request,
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


@app.post("/api/threads/{thread_id}/read")
def mark_thread_read(
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

    db.query(Message).filter(
        Message.thread_id == thread_id,
        Message.sender_id != current_user.id,
        Message.read_at.is_(None),
    ).update(
        {Message.read_at: datetime.now(timezone.utc)},
        synchronize_session=False,
    )
    db.commit()
    return {"ok": True}
