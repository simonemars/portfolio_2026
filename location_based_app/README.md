# Phega

A proximity social app: discover people near you, send friend requests, and chat in real time.

## What it is

Phega lets you find and connect with people around you. The core loop:

- **Discover nearby people** within a radius you control (with optional age filters).
- **Send and accept friend requests.**
- **Chat** one-on-one with your friends.

**Stack**

- **Frontend:** Expo / React Native (runs on iOS + Android via Expo Go).
- **Backend:** FastAPI (Python).
- **Supabase:** authentication, Postgres + PostGIS (geo queries), and realtime.

## Run locally

You need two things running: the FastAPI backend and the Expo dev server.

### Backend

```bash
cd location_based_app/down-to-hang-backend

# create + activate a virtualenv
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

pip install -r requirements.txt
```

Create a `.env` file in `down-to-hang-backend/` with your Supabase Postgres connection string:

```env
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/postgres
# optional: override the default Supabase project URL used for JWT verification
# SUPABASE_URL=https://<your-project>.supabase.co
```

Then start the API:

```bash
uvicorn main:app --reload
```

The API listens on `http://localhost:8000`.

### Frontend

```bash
cd location_based_app
npm install
npx expo start
```

> **Note on the API URL:** `services/api.js` reads the backend URL from
> `app.json`'s `extra.apiUrl` or the `EXPO_PUBLIC_API_URL` env var, and falls
> back to `http://localhost:8000`. That fallback works for the iOS Simulator /
> Android emulator, but **a real phone on Expo Go cannot reach your computer's
> `localhost`.** To test on a physical device, point the API URL at your
> machine's LAN IP (e.g. `http://192.168.1.50:8000`) or a deployed URL — see
> below.

## Deploy for friends

The full Render + Supabase SQL walkthrough lives in
[`down-to-hang-backend/DEPLOY.md`](down-to-hang-backend/DEPLOY.md). The gist:

1. **Set up Supabase** — run the SQL in `DEPLOY.md` to enable the PostGIS
   extension and turn on realtime for the relevant tables.
2. **Deploy the backend to Render** — point a new web service at
   `down-to-hang-backend/`, set `DATABASE_URL` (and `SUPABASE_URL` if needed),
   and use `uvicorn main:app --host 0.0.0.0 --port $PORT` as the start command.
3. **Point the app at the deployed backend** — set `EXPO_PUBLIC_API_URL` (or
   `app.json` → `extra.apiUrl`) to your Render URL.
4. **Share it** — run `npx expo start` for a live dev session, or publish an
   update with `npx eas update` so the link keeps working without your computer.
5. **Friends join** — they install the free **Expo Go** app from the App Store /
   Play Store and open your project link.

## Project structure

```
location_based_app/
├── App.js                 # navigation + Supabase auth/session routing
├── screens/               # Auth, PeopleNearby, Messages, Chat, Profile, Settings, ...
├── components/            # reusable UI (cards, etc.)
├── services/              # api.js, supabase.js, location.js, friends.js, messages.js
├── context/               # React context providers (filters, ...)
├── theme/                 # ThemeContext + theme definitions (dark / light-blue)
└── down-to-hang-backend/  # FastAPI app, SQLAlchemy models, DEPLOY.md
```
