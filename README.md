# TaskFlow

A simple task-management web application: users register/log in, then create, filter and organize tasks into categories. JWT-based authentication, a REST API on Express, a SQLite database, and a vanilla-JS frontend.

## Tech stack

| Layer     | Technology                                             |
| --------- | ------------------------------------------------------ |
| Backend   | Node.js, Express 4                                     |
| Database  | SQLite via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) (synchronous) |
| Auth      | JWT (`jsonwebtoken`) + password hashing (`bcryptjs`)   |
| Frontend  | Vanilla HTML / CSS / JavaScript (`fetch`)              |
| Tests     | Jest + Supertest                                       |

## Project structure

```
Team01_Project/
├── backend/
│   ├── server.js              # Express app entry point (serves API + frontend)
│   ├── database.js            # SQLite connection + schema (users, categories, tasks)
│   ├── taskflow.db            # SQLite database file (created/used at runtime)
│   ├── middleware/
│   │   └── authMiddleware.js  # JWT verification, JWT_SECRET
│   ├── routes/
│   │   ├── auth.js            # /api/auth  (register, login)
│   │   ├── tasks.js           # /api/tasks (CRUD + filtering)
│   │   └── categories.js      # /api/categories (list, create, delete)
│   └── tests/                 # Jest + Supertest suites
└── frontend/
    ├── index.html             # Login page
    ├── register.html          # Registration page
    ├── dashboard.html         # Main app UI
    ├── css/style.css
    └── js/
        ├── api.js             # fetch wrapper for the REST API
        ├── auth.js            # login/register logic
        └── dashboard.js       # tasks/categories UI logic
```

## Prerequisites

- **Node.js** (tested on v26). `better-sqlite3` ships prebuilt binaries; if a build from source is triggered you also need Python + a C/C++ toolchain (Visual Studio Build Tools on Windows).
- **npm**

## Getting started

```bash
cd backend
npm install
npm start          # production mode  -> http://localhost:3000
# or
npm run dev        # dev mode with nodemon auto-reload
```

Then open **http://localhost:3000** in your browser. Express serves the frontend from `../frontend`, so the whole app runs on a single port.

### Environment variables

| Variable     | Default                 | Description                          |
| ------------ | ----------------------- | ------------------------------------ |
| `PORT`       | `3000`                  | Server port                          |
| `JWT_SECRET` | `taskflow_secret_2024`  | Secret used to sign JWTs — **override in production** |
| `NODE_ENV`   | —                       | When set to `test`, uses an in-memory DB |

## Running tests

```bash
cd backend
npm test           # runs Jest with coverage (in-memory DB, --runInBand)
```

## API overview

All `/api/tasks` and `/api/categories` routes require an `Authorization: Bearer <token>` header.

### Auth
| Method | Endpoint             | Body                          | Notes                    |
| ------ | -------------------- | ----------------------------- | ------------------------ |
| POST   | `/api/auth/register` | `{ username, email, password }` | password ≥ 6 chars; returns `{ token, userId, username }` |
| POST   | `/api/auth/login`    | `{ email, password }`         | returns `{ token, userId, username }` |

### Tasks
| Method | Endpoint          | Notes                                                      |
| ------ | ----------------- | ---------------------------------------------------------- |
| GET    | `/api/tasks`      | Supports `?status=&priority=&category_id=&search=` filters |
| GET    | `/api/tasks/:id`  |                                                            |
| POST   | `/api/tasks`      | Body: `{ title, description?, status?, priority?, due_date?, category_id? }` |
| PUT    | `/api/tasks/:id`  | Partial update                                             |
| DELETE | `/api/tasks/:id`  |                                                            |

`status` ∈ `todo | in_progress | done` · `priority` ∈ `low | medium | high`

### Categories
| Method | Endpoint               | Notes                |
| ------ | ---------------------- | -------------------- |
| GET    | `/api/categories`      |                      |
| POST   | `/api/categories`      | Body: `{ name }`     |
| DELETE | `/api/categories/:id`  |                      |

## Database

SQLite database stored at **`backend/taskflow.db`** (created automatically on first run). The schema lives in `backend/database.js` and defines three tables:

- **users** — `id, username, email, password (hashed), created_at`
- **categories** — `id, name, user_id → users(id)`
- **tasks** — `id, title, description, status, priority, due_date, category_id → categories(id), user_id → users(id), created_at, updated_at`

Foreign keys are enabled (`PRAGMA foreign_keys = ON`) with cascading deletes. In test mode (`NODE_ENV=test`) an in-memory database (`:memory:`) is used instead, so tests never touch the file.

See the section below for how to inspect the data.

## Inspecting the database

The database is a single file: `backend/taskflow.db`. A few ways to view it:

- **DB Browser for SQLite** (GUI, easiest) — https://sqlitebrowser.org/ → *Open Database* → select `backend/taskflow.db`.
- **VS Code extension** — install *SQLite Viewer* or *SQLite* (alexcvzz), then click `taskflow.db` in the explorer.
- **sqlite3 CLI:**
  ```bash
  sqlite3 backend/taskflow.db
  .tables
  SELECT * FROM users;
  ```
- **Quick Node one-liner** (uses the already-installed `better-sqlite3`):
  ```bash
  cd backend
  node -e "const db=require('better-sqlite3')('taskflow.db'); console.table(db.prepare('SELECT * FROM tasks').all());"
  ```
