# crppr

<p align="center">
  <img src="frontend/public/crppr-dark.svg" alt="crppr logo" />
</p>

> **WARNING:** This project has been on my todo list for years and I'm finally getting around to doing something about it. This is completely vibe coded, I knocked it out in a weekend, and I haven't reviewed any of the code. Keep proper backups, don't use this for anything truly important, if something breaks you get to keep both pieces. You've been warned.

## What is crppr?

crppr is a self-hosted, recursive home inventory system built as a progressive web app (PWA). It helps you track where everything in your home (or office, workshop, storage unit…) actually _is_ by modelling the real-world nesting of physical spaces and objects.

### Containers & Items

The only concept you need to understand is the **Item**. Every object you track — a room, a shelf, a drawer, a book, a pair of scissors — is an Item. An Item becomes a **Container** the moment you put other Items inside it. That's it. There is no separate "container" type; any Item can hold children, and children can hold children, as deep as you like.

This recursive relationship mirrors how the physical world actually works:

```
House
 └── Garage
      └── Workbench
           └── Top Drawer
                ├── Screwdriver Set
                ├── Flashlight
                └── Box of Nails
```

Every Item in that tree is the same kind of thing. "Garage" is a Container because it has children. "Flashlight" is a leaf because it doesn't — but you _could_ open it up and track the individual batteries inside if you wanted to.

### Identifiers & QR Codes

Each Item can have a short, unique **ident** (e.g. `0042` or `A7F3`) that you can print as a QR code label and stick on the physical object. Scanning a label with your phone instantly opens that item in the app — so you can see what's inside a box without opening it, or figure out where something belongs.

Idents are unique but mutable — you can change, assign, or remove them at any time.

#### Ghosts

Not everything needs a label. A **ghost** is an item with no ident — it exists in the inventory but doesn't have a QR code or scannable label attached to it. Ghosts are perfect for things that aren't worth printing a label for but are still useful to know about: the bag of rubber bands in the junk drawer, the spare batteries in the flashlight, or that one HDMI cable you _know_ is in here somewhere.

Ghost items show up in the app with a `ᗣ` icon in place of the ident. You can promote a ghost to a labeled item at any time by assigning an ident, or demote a labeled item to a ghost by clearing its ident. Any number of ghost items can coexist — uniqueness only applies to non-null idents.

### Metadata

Items can carry arbitrary **metadata** as key-value pairs (an "Entity-Attribute-Value" model). You define the attributes once — "color", "brand", "purchase date", "serial number", whatever makes sense — and then attach values on a per-item basis. This keeps the core data model clean while letting you track whatever extra information matters to you.

### Examples

**Tracking a kitchen:**

| Ident | Name | Parent | Metadata |
| ----- | ---- | ------ | -------- |
| 0001 | Kitchen | — | floor: 1 |
| 0002 | Pantry | Kitchen | |
| 0003 | Top Shelf | Pantry | |
| ᗣ | Canned Tomatoes (6-pack) | Top Shelf | brand: Mutti, expiry: 2026-09 |
| 0005 | Junk Drawer | Kitchen | |
| ᗣ | Rubber Bands | Junk Drawer | color: assorted |
| ᗣ | Takeout Menus | Junk Drawer | |

**Tracking a garage workshop:**

| Ident | Name | Parent | Metadata |
| ----- | ---- | ------ | -------- |
| ae10 | Garage | — | |
| 3412 | Tool Pegboard | Garage | |
| 2de6 | Cordless Drill | Tool Pegboard | brand: DeWalt, model: DCD771 |
| a123 | Parts Cabinet | Garage | material: steel |
| 0014 | Drawer A | Parts Cabinet | label: Screws |
| ᗣ | #8 × 1¼″ Wood Screws | Drawer A | qty: ~200 |

You can nest as deep as you need (`House → Garage → Parts Cabinet → Drawer A → bag of screws`) or keep things flat — the hierarchy adapts to however you think about your stuff.

### Check In / Out

Sometimes things leave their containers — a drill goes out to a job site, a book gets lent to a friend, a bin of holiday decorations comes down from the attic. The **Check In / Out** feature lets you flag an item as "checked out" so you know it isn't where the inventory says it should be. Checked-out items display an amber icon everywhere they appear: the home page recents list, search dropdowns, the item detail page, container contents, and the item picker modal.

### Import & Export

Your data is yours. crppr can export the entire inventory as **JSON** or **CSV** (with all metadata and parent relationships intact) and import it back. The CSV format keeps metadata in a single cell as `key: value` lines, so it stays readable in any spreadsheet app.

## API Docs

FastAPI auto-generates interactive API documentation at `/api/docs` (Swagger UI).

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