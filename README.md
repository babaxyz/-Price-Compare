# Price Compare

A demo-first product comparison app with a dependency-free Node.js API.

## Run locally

```powershell
npm start
```

Open `http://127.0.0.1:4175`.

## Current MVP

- Product search with flexible matching, so searches such as `Samsung S24` match `Samsung Galaxy S24 256GB`.
- Search results render the selected product's own merchant prices instead of stale static prices.
- Lowest price and savings are calculated from the selected product's stores.
- Buy buttons use merchant URLs when available.
- Wishlist and price-alert actions use the currently selected product.
- Demo catalog currently contains sample products and sample merchant prices.

## Production notes

The app currently uses sample catalog data and a JSON file for MVP persistence. Before public launch:

- Replace `data/store.json` with a managed database.
- Configure approved merchant or affiliate feeds using environment variables.
- Keep all keys server-side and use a secret manager.
- Add authentication, HTTPS, backups, monitoring, and a reverse proxy.
- Show affiliate disclosure only when partner links are actually connected.

Google Custom Search is discovery only. It must not be used to scrape merchant HTML or invent prices.
