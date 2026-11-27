# Tea Ceremony

Taste teas together. Create a room with a password, invite friends with the room code, add the
teas you're tasting (with ingredients if you know them), rate each one, and see what the group
likes in the Analytics tab.

- **Backend:** Python 3.13, FastAPI, SQLAlchemy (async), Alembic migrations, argon2 passwords.
- **Frontend:** React 19, TypeScript, Vite, React Query, React Router.
- **Database:** SQLite locally (a file, nothing to install), Postgres in production.
- **Deploy:** one Docker image serves both the API (`/api/...`) and the website.

## How it works

- **Rooms** have a name, a password and a random 8-letter code (`/r/<code>`). The password is
  stored only as an argon2 hash. After 10 wrong passwords in 10 minutes a room stops accepting
  joins for a while. Whoever creates a room is its host, and only the host can delete it, which
  removes its teas and ratings for everyone.
- **Names are unique per room**, ignoring case and extra spaces ("Anna" = " anna "). Joining
  again with the same name continues as that person, which is how you get back in on a new
  phone. Anyone who knows the room password can do that, so the password is what protects a room.
- **Sessions:** joining returns a random token the browser keeps in `localStorage` and sends as
  `Authorization: Bearer ...`. The database only stores a SHA-256 of it.
- **Tea catalog:** teas and their ingredients live in one catalog shared by every room
  (`/catalog`). A room picks teas from it, or adds new ones to it. Ratings belong to the room,
  so the same tea tasted in two rooms keeps separate scores. A catalog tea can only be deleted
  once no room is tasting it. Anyone who is in any room can edit the catalog.
- **The host** adds teas to the room and changes its settings. Everyone can rate, reveal and hide.
- **Scores** stay hidden until anyone reveals them for a tea (and can be hidden again). Analytics
  only count teas whose scores are revealed, so hidden scores can't leak through averages.
- **Room settings** (the host can change them any time):
  - *Blind tasting* (on by default): teas show as "Mystery tea #n" until anyone in the room
    reveals them. The server leaves the name, ingredients and colour out of its replies, so
    hidden teas can't be read from the browser either.
  - *Anonymous ratings*: no names next to scores or notes, and per-person analytics are hidden.
- **Icons:** rooms, people (animals) and teas each have their own set of drawn icons
  (`web/src/lib/illustrations.tsx`), picked by the user or at random. The database stores the
  icon's name, and the API only accepts names from the right set. Teas also have a brew colour
  from a fixed list of real tea colours (`web/src/lib/icons.ts`).
- **Ratings:** Smell, Taste, Finish, Overall (0 to 10), Would buy again, and a note. Each
  change saves on its own. Everyone's scores for a tea stay hidden until someone reveals them.
- **Analytics:** ranking by average Overall, each taster's averages, ingredient preferences
  (each tea's score compared with that person's own average, so a generous scorer doesn't skew
  it), and how closely each pair of tasters agrees.

## Run it locally

Needs [uv](https://docs.astral.sh/uv/) and Node 22+.

```bash
make install
make api     # terminal 1: API on http://localhost:8000 (creates api/tea_ceremony.db)
make web     # terminal 2: website on http://localhost:5190
```

`make test` runs the API tests, lint, the frontend type check and frontend tests.

To try the production setup (Docker image + Postgres) on your machine: `make up`, then open
http://localhost:8000.

## Deploy

The app is one container plus one Postgres database. Settings:

| Variable | Needed | Meaning |
|---|---|---|
| `DATABASE_URL` | yes | Postgres URL. A plain `postgres://...` from your host is fine. |
| `PORT` | set by most hosts | Port to listen on. Defaults to 8000. |
| `CORS_ORIGINS` | no | Only if the website is served from another domain. |

Migrations run automatically every time the container starts.

### Render (simplest)

1. Push this folder to a GitHub repository.
2. In Render: **New → Postgres** (the free tier is fine to start). Copy its **Internal Database URL**.
3. **New → Web Service** → pick the repository → Runtime **Docker**.
4. Add the environment variable `DATABASE_URL` = the URL from step 2.
5. Deploy. Health check path: `/api/health`.

### Railway / Fly.io

Same idea: create a Postgres database, deploy this repository from its `Dockerfile`, and set
`DATABASE_URL`. On Fly: `fly launch` (it detects the Dockerfile), `fly postgres create`, then
`fly postgres attach`, which sets `DATABASE_URL` for you.

## Changing the database

Edit `api/app/models.py`, then `make revision m="what changed"` and commit the new file in
`api/alembic/versions/`. It runs on the next deploy.

## Releasing a new version

Change `version` in both `api/pyproject.toml` and `web/package.json` (a test fails if they differ).
The home page shows it, and `/api/health` reports it, so you can check what a deploy is running.
