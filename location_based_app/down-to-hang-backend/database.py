import logging
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

logger = logging.getLogger(__name__)

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set in .env")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# Best-effort: enable PostGIS so a fresh DB works out of the box. The Supabase
# pooler role may lack the privileges to do this; if so, the manual runbook
# covers enabling the extension, so we log a warning and continue.
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
