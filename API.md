# Price Compare API setup

The server never scrapes Google or merchant HTML. Configure only approved APIs or affiliate feeds in environment variables.

## Search

`GET /api/search?q=iPhone+16`

The response includes normalized merchant results, Google discovery links (when configured), provider status, and a `demo` flag. Google Custom Search does not provide reliable merchant prices, so prices must come from approved merchant feeds.

## Start

```powershell
$env:GOOGLE_CUSTOM_SEARCH_API_KEY = 'your-key'
$env:GOOGLE_CUSTOM_SEARCH_ENGINE_ID = 'your-search-engine-id'
$env:AMAZON_API_URL = 'https://your-approved-adapter.example/search'
npm start
```

Never commit real keys. Use a server-side secret manager in production.
