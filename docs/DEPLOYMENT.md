# PriceWise demo deployment

The published demo uses the curated catalogue and retailer comparison data. It makes no live-price or SerpApi requests. Product/category photographs are local assets and fill their frames without stretching. Wishlist and price-alert records stay in the visitor's browser.

Source repository: https://github.com/master2007-star/beauty

Demo: https://master2007-star.github.io/beauty/

GitHub Pages publishes the `gh-pages` branch. Build from `frontend/` with `GITHUB_PAGES=true` and `VITE_DEMO_ONLY=true`, then publish the contents of `frontend/dist/` to that branch. The build uses `/beauty/` for assets and routing. `404.html` redirects shared product routes back through the SPA entry point.

For local development, run `npm install` and `npm run dev` in `frontend/`. No price API key is needed. Account sign-in, cloud synchronization, profiles and saved routines require the separate Python backend and are not provided by this static demo.
