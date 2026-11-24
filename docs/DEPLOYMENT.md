# PriceWise demo deployment

The published demo uses the curated catalogue and retailer comparison data. It makes no live-price or SerpApi requests. Product/category photographs are local assets and fill their frames without stretching. Signed-in users save wishlists, price targets, alerts, profiles and routines in the account backend. Guest records remain in the visitor's browser.

Source repository: https://github.com/master2007-star/beauty

Demo: https://master2007-star.github.io/beauty/

GitHub Pages publishes the `gh-pages` branch. Build from `frontend/` with `GITHUB_PAGES=true` and `VITE_API_BASE_URL=https://pricewise-beauty-api.onrender.com`, then publish the contents of `frontend/dist/` to that branch. The build uses `/beauty/` for assets and routing. `404.html` redirects shared product routes back through the SPA entry point.

For local development, run `npm install` and `npm run dev` in `frontend/`. No price API key is needed. The full account API runs at https://pricewise-beauty-api.onrender.com. Render hosts the Python service, and an isolated Neon branch stores account data in the pricewise schema. Set DATABASE_URL and AUTH_SECRET_KEY only in the server environment. The API initializes its schema and imports the same 23 demo products at startup; live-price fetching stays disabled. A free Render service may take about a minute to wake after inactivity.
