# Project Documentation: FreshNest

## Overview

This project is a full-stack local marketplace demo for home-based sellers, food makers, produce sellers, and cottage-industry artisans. The app is branded as **FreshNest** and focuses on freshness-first shopping with FreshTrack scores for food, produce, handmade goods, and local products.

The frontend is a React single-page app. The backend is an Express server written in TypeScript. In development, Express also runs Vite middleware, so one command starts both the API and the React UI.

## Tech Stack

- React 19 for the user interface
- TypeScript for frontend and backend code
- Vite for development and frontend builds
- Express for REST API routes
- Tailwind CSS through `@tailwindcss/vite`
- Lucide React for icons
- Google Gemini SDK for optional AI copy generation
- File-backed JSON database stored at `data/marketplace-db.json`

## Main Features

### Buyer Experience

- Browse artisan products by category.
- Search products by name, description, or tags.
- View seller and product details.
- Add products to a local basket.
- Update basket quantities with stock limits.
- Choose pickup or local delivery during checkout.
- Place an order.
- Submit product reviews.
- Save favorite product IDs on the client side.

### Seller Experience

- Switch to the **Artisan Guild** seller workspace.
- Select an active seller profile.
- Edit seller shop information, story, location, badge, avatar, and cover image.
- Add new product listings.
- Edit existing product listings.
- Delete product listings.
- View seller-specific orders.
- Update order status.
- Generate seller stories with Gemini or local fallback copy.
- Generate product descriptions, bullet tags, and suggested prices with Gemini or local fallback copy.

## Project Structure

```text
local-artisan-marketplace/
|-- assets/
|   `-- .aistudio/
|-- src/
|   |-- components/
|   |   `-- Navbar.tsx
|   |-- App.tsx
|   |-- index.css
|   |-- main.tsx
|   `-- types.ts
|-- .env.example
|-- .gitignore
|-- index.html
|-- metadata.json
|-- package.json
|-- PROJECT_DOCUMENTATION.md
|-- README.md
|-- server.ts
|-- tsconfig.json
`-- vite.config.ts
```

## Important Files

- `server.ts`: Express backend, seeded marketplace data, API routes, local JSON persistence, Gemini setup, and Vite middleware.
- `src/App.tsx`: Main React application with buyer UI, seller UI, basket, checkout, forms, and API calls.
- `src/components/Navbar.tsx`: Top navigation with buyer/seller role switch, search, categories, and basket button.
- `src/types.ts`: Shared TypeScript interfaces for products, sellers, reviews, orders, and order items.
- `vite.config.ts`: Vite config with React, Tailwind, and `@` alias support.
- `.env.example`: Example environment variables.
- `package.json`: Scripts and dependencies.

## Backend API Routes

### Marketplace Routes

- `GET /api/sellers`: Return all sellers.
- `POST /api/sellers`: Create or update a seller profile.
- `GET /api/products`: Return all products.
- `POST /api/products`: Create or update a product listing.
- `DELETE /api/products/:id`: Delete a product listing.
- `GET /api/reviews`: Return all reviews, or filter by `productId`.
- `POST /api/reviews`: Add a review and recalculate product rating.
- `GET /api/orders`: Return all orders.
- `POST /api/orders`: Create an order and reduce product stock.
- `POST /api/orders/:id/status`: Update an order status.

### AI Routes

- `POST /api/gemini/generate-story`: Generate a seller biography and tags.
- `POST /api/gemini/generate-description`: Generate a product description, bullet points, and suggested price.

If `GEMINI_API_KEY` is missing or invalid, these AI routes still return local fallback responses.

## How To Run Locally

1. Open PowerShell.
2. Go to the project folder:

```powershell
cd C:\Users\arfat\Downloads\local-artisan-marketplace
```

3. Install dependencies:

```powershell
npm install
```

4. Optional: create `.env.local`:

```powershell
copy .env.example .env.local
```

5. Optional: edit `.env.local`:

```text
GEMINI_API_KEY="your_actual_key_here"
APP_URL="http://localhost:3000"
```

6. Start the app:

```powershell
npm run dev
```

7. Open:

```text
http://localhost:3000
```

## Build And Production Run

Create a production build:

```powershell
npm run build
```

Run the production server:

```powershell
npm start
```

## Data Storage Note

The app stores sellers, products, reviews, and orders in the local JSON database at `data/marketplace-db.json`. On first run, the server seeds that file from the default marketplace data in `server.ts`. After that, seller profiles, product listings, stock changes, reviews, orders, and order status updates are saved immediately.

The local runtime database file is ignored by Git so local marketplace data is not accidentally committed.

## Environment Variables

- `GEMINI_API_KEY`: Optional Gemini API key for AI-generated copy.
- `APP_URL`: Optional app URL. In local development, use `http://localhost:3000`.

## Development Notes

- The development server runs on port `3000`.
- The server listens on `0.0.0.0`, so it can be accessed from the local machine at `http://localhost:3000`.
- The frontend talks to the backend using relative `/api/...` URLs.
- The local database file is created automatically on first server start.
- No payment integration is included; checkout creates local test orders only.
