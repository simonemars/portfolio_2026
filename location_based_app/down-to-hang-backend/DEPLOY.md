# Deploying the Phega backend to Render

The Phega backend is a synchronous FastAPI app (entrypoint `main:app`) backed by
Supabase Postgres with the PostGIS extension. This guide covers the one-time
Supabase setup, deploying to Render, verifying the deploy, and pointing the
mobile app at it.

---

## 1. Supabase SQL (run once)

Open the Supabase project's **SQL editor** and run the following.

### Enable PostGIS

The discover/nearby queries rely on `ST_DWithin` / `ST_Distance`, so PostGIS
must be enabled:

```sql
create extension if not exists postgis;
```

### Enable realtime + RLS for messages

Realtime chat in the app subscribes to inserts on `public.messages`, so the
table must be added to the realtime publication:

```sql
alter publication supabase_realtime add table public.messages;
```

> **NOTE — RLS:** If Row Level Security is enabled on `public.messages`, the
> Supabase realtime stream will only deliver rows the *client's* JWT is allowed
> to `SELECT`. You therefore need a SELECT policy that lets a user read messages
> in threads they participate in. Example:
>
> ```sql
> alter table public.messages enable row level security;
>
> create policy "participants can read thread messages"
>   on public.messages
>   for select
>   using (
>     exists (
>       select 1
>       from public.thread_participants tp
>       join public.users u on u.id = tp.user_id
>       where tp.thread_id = messages.thread_id
>         and u.auth_id = auth.uid()
>     )
>   );
> ```
>
> The FastAPI backend connects with the **service-role** `DATABASE_URL`, which
> bypasses RLS — so backend writes/reads are unaffected. RLS policies only
> matter for the app's direct realtime subscription. If you do not enable RLS,
> no policy is required, but the table must still be in the publication above.

---

## 2. Deploy to Render

1. Sign up / log in at <https://render.com>.
2. Either:
   - **Blueprint (recommended):** click **New +** → **Blueprint**, connect the
     `simonemars/portfolio_2026` GitHub repo, and Render will pick up
     `location_based_app/down-to-hang-backend/render.yaml` automatically; **or**
   - **Manual:** click **New +** → **Web Service**, connect the
     `simonemars/portfolio_2026` repo, choose **Docker**, and set the
     **Root Directory / Docker context** to
     `location_based_app/down-to-hang-backend`.
3. Add the environment variables (under **Environment**):

   | Key               | Value                                                  |
   | ----------------- | ------------------------------------------------------ |
   | `DATABASE_URL`    | the Supabase **pooler** connection string (from `.env`)|
   | `SUPABASE_URL`    | `https://uhfgfoiueykqlmlxnbsw.supabase.co`             |
   | `ALLOWED_ORIGINS` | `*`                                                    |

   > `DATABASE_URL` is the service-role Supabase Postgres pooler URL from the
   > backend's local `.env` (which is git-ignored and not committed).

4. Click **Create Web Service** / **Apply** and wait for the build + deploy.
5. Copy the public URL Render assigns, e.g.
   `https://phega-api-XXXX.onrender.com`.

---

## 3. Verify

```bash
curl https://<your-app>.onrender.com/health
```

A healthy service returns an OK response.

---

## 4. Point the app at the backend

Set the frontend's API base URL to the Render URL. The app reads, in order:
`Constants.expoConfig.extra.apiUrl`, then `EXPO_PUBLIC_API_URL`
(see `location_based_app/services/api.js`). Either:

- set `EXPO_PUBLIC_API_URL=https://<your-app>.onrender.com`, or
- set `extra.apiUrl` in `app.json` to that URL.

(Another unit wires this into the app config — cross-reference that change.)

---

## Notes

- **Free tier cold starts:** Render's free web services sleep after ~15 minutes
  of inactivity and take ~30s to cold-start on the next request. The first
  request after idle (including the health check) may be slow.
