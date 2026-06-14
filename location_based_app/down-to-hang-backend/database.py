import logging
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

logger = logging.getLogger(__name__)

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set")

# connect_timeout bounds how long a new connection may block before failing, so
# a slow or unreachable database fails fast instead of hanging worker startup
# forever (which manifests as the server accepting TCP but never responding).
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 10},
)

# PostGIS only needs enabling once (done via the deploy runbook, and already
# enabled on the managed database). Running CREATE EXTENSION at import time
# opens a DB connection during module import — if that blocks, the worker never
# finishes booting. So it is opt-in via ENABLE_POSTGIS_BOOTSTRAP and off by
# default; the import path stays connection-free.
if os.getenv("ENABLE_POSTGIS_BOOTSTRAP") == "1":
    try:
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
            conn.commit()
    except Exception as exc:
        logger.warning("Could not enable PostGIS extension automatically: %s", exc)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
