# PriceWise Beauty

A beauty product comparison website with a React frontend and a Python account backend.

**[Open the website](https://master2007-star.github.io/beauty/)** · **[API documentation](https://pricewise-beauty-api.onrender.com/docs)**

## Features

- Browse 23 beauty products across 19 categories.
- Compare sample retailer prices and open product or retailer search links.
- Discover affordable alternatives and ingredient/usage information.
- Sign up, log in and save favourite products.
- Save profiles, AM/PM routines, price targets and in-app alerts.

**Prices, discounts and reviews are demo data.** Accounts and saved account data use a real backend. No live-price API or SerpApi is used.

## Source code

```text
beauty/
├── backend/
│   ├── src/api/          # API routes and account access
│   ├── src/database/     # Database connections and catalogue loading
│   ├── src/services/     # Accounts, profiles, routines and product logic
│   ├── src/analysis/     # Price comparison calculations
│   ├── data/             # Demo catalogue and database schemas
│   ├── tests/            # Backend tests
│   ├── scripts/          # Database schema tools
│   └── requirements.txt  # Backend dependencies
├── frontend/
│   ├── src/              # Pages, components, hooks and styles
│   ├── public/images/    # Product and category photographs
│   └── scripts/          # Image/link checks and catalogue export
├── docs/DEPLOYMENT.md     # Hosting instructions
├── graphify-out/          # Generated code map; local caches are ignored
└── render.yaml            # Backend hosting configuration
```

## Run locally

Install **Node.js 24+**, **Python 3.12+** and **Git**. These commands use Windows PowerShell.

### 1. Download the source

```powershell
git clone https://github.com/master2007-star/beauty.git
cd beauty
```

### 2. Start the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload
```

API: **http://127.0.0.1:8000**. API documentation: **http://127.0.0.1:8000/docs**.

Leave DATABASE_URL blank for local development. The backend creates a SQLite database and loads the demo catalogue automatically.

### 3. Start the frontend

Open a second terminal in the repository:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open the localhost link printed by Vite, normally **http://localhost:5173**.

On macOS/Linux, use python3 to create the virtual environment and .venv/bin/python for backend commands.

## Check the project

From backend/, run `.\.venv\Scripts\python.exe -m pytest`.

From frontend/:

```powershell
npm run build
npm run check:images
npm run check:categories
npm run check:links
```

After changing product data, run `node scripts/export-catalogue.mjs` from frontend/ to update the backend catalogue.

## Hosting

The frontend uses GitHub Pages, the API runs on Render, and account data is stored in Postgres on an isolated Neon branch.

See [deployment instructions](docs/DEPLOYMENT.md). A free Render service may take about a minute to wake after inactivity.

Keep .env files, passwords, database URLs, local databases and build folders out of Git. Photograph source information is stored in the sources.json files under frontend/public/images/.
