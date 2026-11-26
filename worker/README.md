# PriceWise Beauty - Cloudflare Worker Edge Compare API

Serverless Edge API running on Cloudflare Workers for 5-Store Indian beauty price comparison (Nykaa, Amazon India, Tira Beauty, Purplle, Myntra).

## Deployment

Deploy in 10 seconds using [Wrangler](https://developers.cloudflare.com/workers/wrangler/):

```bash
cd worker
npx wrangler deploy
```

Once deployed, copy your worker URL (e.g., `https://pricewise-beauty-worker.<your-subdomain>.workers.dev`) and set it in your frontend `.env`:

```env
VITE_LIVE_SEARCH_API=https://pricewise-beauty-worker.<your-subdomain>.workers.dev
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
