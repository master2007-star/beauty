# Deployment

## Live services

- Website: https://master2007-star.github.io/beauty/
- API: https://pricewise-beauty-api.onrender.com
- API documentation: https://pricewise-beauty-api.onrender.com/docs

Product prices remain demo data. Accounts, saved products, profiles, routines, targets and alerts use the backend.

## Backend on Render

Use render.yaml or these settings:

| Setting | Value |
| --- | --- |
| Repository / branch | master2007-star/beauty / main |
| Root directory | backend |
| Runtime | Python 3.12 |
| Build command | pip install -r requirements.txt |
| Start command | uvicorn src.api.main:app --host 0.0.0.0 --port $PORT |
| Health check | /api/health |

Server-only settings: APP_ENV=production, DATABASE_URL, AUTH_SECRET_KEY and CORS_ORIGINS=https://master2007-star.github.io. AUTH_SECRET_KEY must contain at least 32 random characters.

The existing service loads its private settings from /etc/secrets/backend.env through PRICEWISE_ENV_FILE. Keep that file out of Git.

The backend initializes the schema and imports backend/data/frontend-catalogue.json on startup. Persistent account data is stored in the pricewise schema on an isolated Neon branch. Local SQLite files should only be used for development.

## Frontend on GitHub Pages

From frontend/:

```powershell
$env:GITHUB_PAGES = 'true'
$env:VITE_API_BASE_URL = 'https://pricewise-beauty-api.onrender.com'
npm ci
npm run build
```

Publish frontend/dist/ to the gh-pages branch. GitHub Pages uses that branch's root directory. Keep .nojekyll in the published branch.

The build uses /beauty/ for assets and routing. The 404.html redirect supports shared product URLs.

Only VITE_API_BASE_URL belongs in frontend settings. Database credentials and AUTH_SECRET_KEY stay on the backend.

## Verify

1. Check /api/health returns status: ok.
2. Test signup/login and saving a product, profile, routine and target.
3. Refresh to confirm the account data persists.
4. Check images and product links.
