# crppr

A recursive home inventory PWA. Every object is an **Item**; a **Container** is simply an Item that has children.

## Stack

| Layer    | Tech                                        |
| -------- | ------------------------------------------- |
| Backend  | FastAPI · SQLAlchemy 2.0 · Alembic · Pydantic |
| Frontend | React (Vite) · Tailwind CSS · QR scanner    |
| Database | SQLite (default) · PostgreSQL (optional)     |

## Quick Start

### Local (SQLite — zero config)

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

The API starts on `http://localhost:8000` with an SQLite database (`crppr.db`) created automatically.
The frontend dev server runs on `http://localhost:5173` and proxies `/api` to the backend.

### PostgreSQL

Configure via environment variables (or in `.env`):

```bash
CRPPR_DB_TYPE=postgresql
CRPPR_DB_HOST=localhost
CRPPR_DB_PORT=5432
CRPPR_DB_NAME=crppr
CRPPR_DB_USER=postgres
CRPPR_DB_PASSWORD=postgres
```

### Docker Compose (PostgreSQL)

```bash
docker compose up -d
```

This starts PostgreSQL and the backend+frontend on `http://localhost:8000`.
Credentials are read from `.env` (see `.env` for defaults).

## API Docs

FastAPI provides auto-generated interactive docs:

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **OpenAPI JSON:** `http://localhost:8000/openapi.json`

## API Endpoints

| Method | Path                                      | Description                           |
| ------ | ----------------------------------------- | ------------------------------------- |
| GET    | `/health`                                 | Health check                          |
| GET    | `/a/{ident}`                              | Lookup by ident → redirect to item    |
| GET    | `/items`                                  | List root items                       |
| GET    | `/items/search?q=`                        | Search items by name/ident/desc/meta  |
| GET    | `/items/{id}`                             | Get item with metadata and children   |
| POST   | `/items`                                  | Create item (auto-ident if omitted)   |
| PATCH  | `/items/{id}`                             | Update item (triggers address recalc) |
| GET    | `/items/{id}/path`                        | Breadcrumb trail                      |
| PUT    | `/items/{id}/image`                       | Image upload (stub)                   |
| POST   | `/items/{id}/metadata`                    | Set metadata values                   |
| DELETE | `/items/{id}/metadata/{attribute_id}`     | Remove a metadata value               |
| GET    | `/metadata-attributes/`                   | List metadata attributes              |
| POST   | `/metadata-attributes/`                   | Create metadata attribute             |
| PUT    | `/metadata-attributes/reorder`            | Reorder attributes (drag-and-drop)    |
| DELETE | `/metadata-attributes/{id}`               | Delete attribute + cascade values     |
| POST   | `/ident/generate`                         | Generate next available ident         |
| GET    | `/settings/`                              | List all settings                     |
| GET    | `/settings/{key}`                         | Get a setting                         |
| PUT    | `/settings/{key}`                         | Set a setting                         |

## Tests

Run the full test suite in Docker:

```bash
make test
```

Other Make targets:

```bash
make up      # docker compose up -d
make down    # docker compose down
```

## Project Structure

```
├── backend/
│   ├── alembic/               # Database migrations
│   │   ├── env.py
│   │   └── versions/          # Migration scripts
│   ├── api/
│   │   ├── config.py          # Settings (DB_TYPE, DB_HOST, etc.)
│   │   ├── database.py        # Engine + session (SQLite/Postgres)
│   │   ├── main.py            # FastAPI app, Alembic startup, SPA serving
│   │   ├── models.py          # Item, MetadataAttribute, MetadataValue, Setting
│   │   ├── schemas.py         # Pydantic request/response models
│   │   ├── routers/
│   │   │   ├── items.py       # Item CRUD, search, breadcrumbs, metadata values
│   │   │   ├── metadata.py    # Metadata attribute CRUD + reorder
│   │   │   ├── ident.py       # Ident generation
│   │   │   └── settings.py    # Application settings
│   │   └── services/
│   │       ├── address.py     # Materialized path recalculation
│   │       └── ident.py       # Next-available-ident logic
│   ├── tests/
│   │   ├── conftest.py        # Test fixtures (Alembic + SQLite test DB)
│   │   ├── test_items.py      # Item CRUD, move, breadcrumb, metadata tests
│   │   ├── test_metadata.py   # Metadata attribute + EAV value tests
│   │   ├── test_ident.py      # Ident generator tests
│   │   ├── test_search.py     # Search endpoint tests
│   │   └── test_openapi.py    # OpenAPI schema test
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── api.js             # API client
│       ├── App.jsx            # Router
│       ├── components/        # Layout, SideMenu, BreadcrumbNav, ItemTree,
│       │                      # EAVEditor, MetadataKeyInput, QRScanner,
│       │                      # IdentGenerator, SearchBar, Toast, ConfirmModal,
│       │                      # ItemPickerModal
│       ├── hooks/             # useTheme, useDrawer, useDocTitle
│       └── pages/             # HomePage, ItemDetailPage, CreateItemPage,
│                              # InventoryPage, MetadataPage, SettingsPage,
│                              # LookupPage, IdentPage
├── .env                       # Database config (used by docker-compose + backend)
├── Dockerfile                 # Multi-stage production build
├── Dockerfile.test            # Test runner
├── docker-compose.yaml        # PostgreSQL + backend
└── Makefile
```