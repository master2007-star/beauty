# PriceWise Beauty - Cloudflare Worker Edge Compare API

Serverless Edge API running on Cloudflare Workers for 5-Store Indian beauty price comparison (Nykaa, Amazon India, Tira Beauty, Purplle, Myntra).

## Automatic Deployment via GitHub Actions

This repository includes `.github/workflows/deploy-worker.yml`.
To deploy automatically:
1. In your GitHub repo settings, go to **Settings → Secrets and variables → Actions**.
2. Add a repository secret named `CLOUDFLARE_API_TOKEN` containing your Cloudflare Workers API token (create one at https://dash.cloudflare.com/profile/api-tokens with template "Edit Cloudflare Workers").
3. Push to `main` (or run **Actions → Deploy Cloudflare Worker → Run workflow**).

Wrangler deploys the worker as `pricewise-compare` with compatibility date `2026-11-01`.

## Local / Manual Deployment

```bash
cd worker
npx wrangler deploy
```

Once deployed, copy your worker URL (e.g., `https://pricewise-compare.<your-subdomain>.workers.dev`):
- Paste it into the search modal settings (⚙️ icon) in PriceWise Beauty. It persists in browser `localStorage` (`PRICEWISE_WORKER_URL`) without rebuilding the site!
- Or set it in your frontend `.env`:
```env
VITE_LIVE_SEARCH_API=https://pricewise-compare.<your-subdomain>.workers.dev
```

## API Endpoint

### `GET /compare?q=<query>`

Example:
```
GET /compare?q=Minimalist+10%25+Niacinamide
```

Response:
```json
{
  "query": "Minimalist 10% Niacinamide",
  "updatedAt": "2026-11-26T16:50:00.000Z",
  "bestPrice": 499,
  "results": [
    {
      "retailer": "Amazon India",
      "productTitle": "Minimalist 10% Niacinamide Serum with Zinc",
      "imageUrl": null,
      "price": 499,
      "mrp": 599,
      "productUrl": "https://www.amazon.in/dp/B08F9MF314",
      "inStock": true
    },
    {
      "retailer": "Nykaa",
      "productTitle": "Minimalist 10% Niacinamide Face Serum (30ml)",
      "imageUrl": null,
      "price": 549,
      "mrp": 599,
      "productUrl": "https://www.nykaa.com/minimalist-10percent-niacinamide/p/14072071",
      "inStock": true
    }
  ]
}
```
