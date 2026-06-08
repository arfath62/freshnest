# FreshNest

FreshNest is a freshness-first local marketplace demo built with React, Vite, Express, and TypeScript. It lets buyers inspect FreshTrack scores, browse local products, add items to a basket, place pickup or delivery orders, and leave product reviews. Sellers can manage their shop profile, add or edit product listings, upload product images, track orders, and publish freshness timing.

## Run The Project

Open a terminal in this folder:

```powershell
cd C:\Users\arfat\Downloads\local-artisan-marketplace
```

Install dependencies:

```powershell
npm install
```

Optional: create a local environment file for Gemini AI features:

```powershell
copy .env.example .env.local
```

Then edit `.env.local` and replace `MY_GEMINI_API_KEY` with your real Gemini API key. The app still runs without a key because the server has fallback mock AI responses.

Start the development server:

```powershell
npm run dev
```

Open this URL in your browser:

```text
http://localhost:3000
```

## Other Commands

```powershell
npm run lint
npm run build
npm start
```

Use `npm run lint` to type-check the project. Use `npm run build` to create production files in `dist`, then `npm start` to run the built server.

## Database

FreshNest stores marketplace data in a local JSON database at `data/marketplace-db.json`. The file is created automatically on first server start. Seller profiles, product listings, reviews, orders, stock changes, and order status updates are saved there, so listed products stay available after restarts until the seller deletes them.

## More Documentation

See [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) for the full project overview, features, file structure, API routes, and setup notes.
