# Channel Q&A (Next.js + PostgreSQL + Docker)

Full-stack, channel-based Q&amp;A with threaded replies, voting, image uploads, admin moderation, and search. All **write** operations require authentication.

# The link to the demo video is :
**https://drive.google.com/file/d/17nmDiGHbnNs0X-QHxCaEGEjmSDBdxtEE/view?usp=sharing**

## Quick start (Docker)

From the project root:

```bash
docker compose up --build
```

Then open **http://localhost:3001** 

On every app startup, the container:

1. Waits for PostgreSQL to be ready  
2. Applies `db/migrations/001_schema.sql` (idempotent)  
3. Runs `db/seed.sql` (idempotent inserts)  
4. Starts the Next.js server  

### Seeded credentials

| Display name | Password   | Role  |
|-------------|------------|-------|
| `admin`     | `Admin123!` | admin |
| `demo`      | `User123!`  | user  |

Database (Compose):

- **Host (from your machine):** `localhost:5432` (only if you publish the port; default compose file does not publish DB)  
- **From app container:** `db:5432`  
- **User / password / database:** `qa` / `qa` / `qa`  
- **URL inside Compose:** `postgresql://qa:qa@db:5432/qa`  

Uploaded files are stored in the `uploads` Docker volume (`UPLOAD_DIR=/data/uploads`).

### Session secret (Compose)

`docker-compose.yml` sets `SESSION_SECRET` for local Compose. For real deployments, override it with a long random value (minimum **32** characters).

**Cookies over HTTP:** The app sets `SESSION_COOKIE_SECURE=false` in Compose so sign-in works on `http://localhost`. Browsers ignore `Secure` session cookies on plain HTTP; with `NODE_ENV=production` alone, login would appear to succeed but the session would never stick. When you deploy behind HTTPS, set `SESSION_COOKIE_SECURE=true`.

## Local development (without Docker)

1. Install PostgreSQL 16+ and create a database and user (or reuse `qa`/`qa`/`qa`).  
2. Copy `.env.example` to `.env` and set at least:

   ```env
   DATABASE_URL=postgresql://qa:qa@localhost:5432/qa
   SESSION_SECRET=<output of: openssl rand -hex 32>
   ```

3. Apply schema and seed:

   ```bash
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/001_schema.sql
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/seed.sql
   ```

4. Install and run:

   ```bash
   npm install
   npm run dev
   ```

   App: **http://localhost:3001**

## Ports

| Service | Port (default) |
|--------|----------------|
| Next.js app | 3001 |
| PostgreSQL (Compose internal) | 5432 |

## Features and rules

### Authentication

- Passwords are hashed with **bcrypt** (cost factor 12 on signup).  
- Sessions use **iron-session** (encrypted HTTP-only cookie, `SameSite=Lax`).  
- Every **POST** (and **DELETE**) API route checks the session; unauthenticated users get **401**.  

### Voting

- **One vote per user per target**, enforced with `UNIQUE (user_id, target_type, target_id)` on `votes`.  
- Clients can **change** a vote or **remove** it (`value: 0` via `/api/votes`).  
- **Users cannot vote on their own posts or replies** (enforced in the API).  
- Posts and replies return **net score** (sum of `+1` / `-1`) and the current user’s vote when logged in.  

### Threading

- Replies reference `post_id` and optional `parent_reply_id` for nesting at **unlimited depth**.  
- The UI renders a **recursive** tree with increasing left indentation per level.  

### File uploads

- Allowed: **PNG, JPEG, WebP** — both **declared MIME type** and **file extension** are validated.  
- Max size: **5 MB**.  
- Files are stored under `UPLOAD_DIR` with a **random UUID** filename and safe extension; paths are not user-controlled.  
- Files are served only via **`GET /api/files/[id]`** (no direct static mapping to upload directory).  

### Admin

- Only `role = admin` may call admin delete routes and `GET /api/admin/moderation`.  
- Deleting users, channels, posts, or replies uses **CASCADE** where defined in the schema.  

### Rate limiting (basic, in-memory)

- **Sign-in / sign-up:** per IP (see `src/lib/rateLimit.ts`).  
- **Posts / replies:** per authenticated user.  

### Security notes

- User text is sanitized with **DOMPurify** (no HTML tags stored).  
- React renders bodies as **plain text** (`white-space: pre-wrap`) to avoid XSS.  
- Session cookies are **HTTP-only**; **SameSite=Lax** reduces CSRF risk for same-site browsers. For cross-site APIs you would add CSRF tokens.  

---

## Search

API: **`GET /api/search`** with `mode` and pagination (`page`, `pageSize` ≤ 50).

### Modes and fields searched

| `mode` | What it does | Fields / logic |
|--------|----------------|----------------|
| `substring` (default) | Case-insensitive substring match | **Posts:** `title`, `body`. **Replies:** `body`. Uses `ILIKE` and `pg_trgm` indexes on those columns. |
| `author` | Content by author | Same post/reply rows where the author’s **`display_name`** matches `author` (`ILIKE`). |
| `most_posts` | Users ranked by post count (descending) | `COUNT(posts)` per `users` row (including 0 posts). |
| `least_posts` | Users ranked by post count (ascending) | Same aggregation, ascending. |
| `ranked` | Highest/lowest **net vote score** | Each **post** and **reply** gets `SUM(votes.value)` (0 if none). **Ranking:** primary = net score (`order=highest` default, or `lowest`); secondary = `created_at DESC` for stability. |

### Results

- Every hit includes a **contextual snippet** (for substring/author, centered on the match when possible).  
- Each item includes a **clickable `href`** to `/posts/:id` or `/posts/:postId#reply-:id`.  
- **Pagination:** use `page` / `pageSize`; the UI also offers **Load more** on Search and channel posts.  

---

## API overview (write = auth required)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/auth/signup`, `/api/auth/login`, `/api/auth/logout` | Logout does not require body. |
| GET | `/api/auth/me` | Current session. |
| GET/POST | `/api/channels` | POST creates channel. |
| GET | `/api/channels/[id]` | Channel metadata. |
| GET/POST | `/api/channels/[id]/posts` | Paginated posts; POST creates post. |
| GET | `/api/posts/[id]` | Post + attachments. |
| GET/POST | `/api/posts/[id]/replies` | Threaded tree; POST creates reply (`parentReplyId` optional). |
| POST | `/api/votes` | Body: `{ targetType, targetId, value: 1 \| -1 \| 0 }`. |
| POST | `/api/uploads` | `multipart/form-data`: `targetType`, `targetId`, `file`. |
| GET | `/api/files/[id]` | Serves attachment bytes. |
| GET | `/api/search` | See above. |
| GET | `/api/admin/moderation` | Admin only — lists users, channels, recent posts/replies. |
| DELETE | `/api/admin/users/[id]`, `.../channels/[id]`, `.../posts/[id]`, `.../replies/[id]` | Admin only. |

---

## UI map

- **`/`** — Landing only: description + **Sign In** / **Sign Up** (no channel or post data).  
- **`/channels`** — List + create channel (create requires sign-in; otherwise **Access denied**).  
- **`/channels/[id]`** — Posts + create post + load more.  
- **`/posts/[id]`** — Post, vote, attachments, top-level reply form, **recursive** reply tree, nested replies, voting, uploads.  
- **`/search`** — Five search modes + pagination / load more.  
- **`/admin`** — Moderation lists + delete controls (admin only).  

---

## License

Provided as coursework / demonstration; adjust as needed.
