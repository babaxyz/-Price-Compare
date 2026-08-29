# Price Compare

A demo-first product comparison app with a dependency-free Node.js API.

## Run locally

```powershell
npm start
```

Open `http://127.0.0.1:4175`.

## Production notes

The app currently uses sample catalog data and a JSON file for MVP persistence. Before public launch:

- Replace `data/store.json` with a managed database.
- Configure approved merchant or affiliate feeds using `.env.example`.
- Keep all keys server-side and use a secret manager.
- Add authentication, HTTPS, backups, monitoring, and a reverse proxy.
- Show the affiliate disclosure only when partner links are actually connected.

Google Custom Search is discovery only. It must not be used to scrape merchant HTML or invent prices.
