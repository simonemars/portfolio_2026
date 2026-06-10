FROM python:3.12-slim

# psycopg2-binary ships its own libpq, so no apt build deps are needed.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install Python dependencies first to leverage Docker layer caching.
# gunicorn is added here because it is the production process manager and
# is not pinned in requirements.txt.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy the rest of the application source.
COPY . .

EXPOSE 8000

# Shell-form CMD so ${PORT} (set by Render) is expanded at runtime.
# Falls back to 8000 for local runs.
CMD gunicorn -k uvicorn.workers.UvicornWorker main:app -b 0.0.0.0:${PORT:-8000} --workers 2
