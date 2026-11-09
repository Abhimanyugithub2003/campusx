# CampusX – Student Resale & Live Auction Marketplace

CampusX is an end-to-end university campus marketplace enabling verified students to safely buy, sell, bargain, and auction campus essentials—from laptops and engineering textbooks to cycles, sneakers, and campus fest tickets.

It features a full **Node.js/Express + Socket.IO** backend, a **FastAPI + PyMongo + Scikit-Learn** ML recommendation & analytics engine, and a modern **React + Tailwind CSS** frontend.

---

## Architecture Overview

```
                                 ┌───────────────────────────────┐
                                 │   React + Tailwind Frontend   │
                                 │      (Vite on port 5173)      │
                                 └──────────────┬────────────────┘
                                                │
                     ┌──────────────────────────┴──────────────────────────┐
                     │ REST / Uploads / WebSockets                         │ Direct /ml Proxy
                     ▼                                                     ▼
    ┌──────────────────────────────────┐                  ┌──────────────────────────────────┐
    │     CampusX Node.js Backend      │                  │   CampusX ML & Analytics Service │
    │    (Express, Socket.IO :5000)    │                  │       (FastAPI, Uvicorn :8000)   │
    └────────────────┬─────────────────┘                  └────────────────┬─────────────────┘
                     │                                                     │
                     └──────────────────────────┬──────────────────────────┘
                                                ▼
                               ┌─────────────────────────────────┐
                               │     MongoDB (Database: campusx) │
                               │        (Port 27017 or Atlas)    │
                               └─────────────────────────────────┘
```

---

## Key Features Implemented

### 1. Authentication & Student Verification
- **University Email Domain Enforcement**: Registration accepts only verified domains (e.g., `@lpu.in`, `@university.edu`, `@campusx.edu`, `@iit.ac.in`).
- **Email OTP Verification**: 6-digit verification code with automatic MongoDB TTL expiration index (`expires: 0`).
- **BCrypt + JWT**: 12-round salted hashing and 7-day signed JWT tokens.
- **Fast Persona Switcher**: Instant 1-click switching between pre-seeded student personas in the UI for testing.

### 2. Flexible Catalog & Private Reserve Price
- **Category-Specific Dynamic Attributes**:
  - *Laptops*: Processor, RAM, Storage, Battery Cycle Count
  - *Books*: Author, Edition, Course/Semester
  - *Cycles*: Gear System, Frame Size, Brakes
  - *Shoes*: Shoe Size (UK/US), Colorway
  - *Tickets*: Event Date, Access Tier
- **Private Reserve Price**: `minimum_price` has `{ select: false }`; only the seller's authenticated endpoint can view it.
- **Image Upload**: Supports multipart uploads via Multer with Cloudinary integration and local disk storage fallback.

### 3. Real-Time Interactive Bargaining & Chat
- **Alternating Turns**: Buyer and seller must alternate counter-offers; self-countering is blocked.
- **Offer Acceptance**: Accepting an offer reserves the product and immediately creates an escrow order.
- **Socket.IO Chat**: Live chat room between buyer and seller with persistent MongoDB message history.

### 4. Atomic Live Auctions
- **Concurrency Protection**: Conditional atomic update (`$set: { current_highest_bid, highest_bidder_id }`) ensures two simultaneous bidders can never both succeed on the same price.
- **Live Bid Stream**: Socket.IO broadcasts bids instantly to all connected peers in the auction room.
- **Settlement Engine**: Background runner checks expired auctions every 10 seconds, closes them, and auto-creates the winning order.

### 5. Secure Orders, Escrow Payments & Digital Receipts
- **Database-Driven Amounts**: Payment amounts strictly come from the MongoDB record, never the client request.
- **Razorpay + DEV Mock Mode**: Verify HMAC SHA256 payment signatures when keys are set; falls back to an instant DEV Mock payment flow when keys are omitted.
- **Verified PDF Receipt**: Generated via PDFKit at `/api/orders/:id/receipt.pdf` with receipt number and payment ref.
- **Privacy-Preserving Contact Release**: Phone numbers and emails are hidden until payment is verified.
- **Campus Meeting & Handover**: Coordinate campus handover locations (e.g., Central Library, Cafeteria); both parties must confirm handover before the order transitions to `completed`.

### 6. Reviews & Bayesian Seller Trust Score
- **Verified Purchase Reviews**: Only completed orders can be reviewed (1 review per order).
- **Bayesian Prior**: New sellers start with a prior mean of 3.5 over 5 pseudo-reviews so they are not penalized for having zero reviews.
- **Trust Weights**:
  $$\text{Trust} = 0.30(\text{Rating}) + 0.25(\text{Quality}) + 0.15(\text{Completed}) + 0.15(\text{Success}) + 0.10(\text{Verified}) + 0.05(\text{Response})$$

### 7. ML Recommendations & Market Intelligence
- **Hybrid Scored Recommender**:
  $$\text{Score} = 0.40 C + 0.30 T + 0.20 P + 0.10 Q$$
  - $C$: TF-IDF text similarity + collaborative filtering signals from `user_events`
  - $T$: Seller trust score
  - $P$: Listing view popularity
  - $Q$: Average rating
- **Live Aggregation Dashboards**: Category distribution, monthly revenue, top seller leaderboards, auction success rate, and high-interest/low-conversion items.

---

## Quick Start Guide

### Prerequisites
- **Node.js** v18+ (tested on Node v22)
- **Python** 3.10+ (tested on Python 3.12)
- **MongoDB** running locally on `mongodb://127.0.0.1:27017` or MongoDB Atlas

---

### Option A: The 1-Terminal Command (Recommended)
From the root directory (`campusx`), run:
```bash
npm run dev
```
This runs the **Backend**, **ML Service**, and **Frontend** simultaneously inside your single terminal window with live color-coded logs:
- `[backend]` on `http://localhost:5000`
- `[ml]` on `http://localhost:8000`
- `[frontend]` on `http://localhost:5173`

---

### Option B: One-Click Startup Script (Windows Popup Windows)
Double-click `start-all.bat` or run:
```powershell
.\start-all.ps1
```

---

### Option B: Step-by-Step Manual Run

#### 1. Start MongoDB
Ensure MongoDB is running (e.g. via Windows Services or `mongod`).

#### 2. Seed Sample Database
Populate student users, realistic campus listings, active auctions, and reviews:
```bash
cd backend
npm run seed
```

#### 3. Start Backend (Node.js API + Socket.IO)
```bash
cd backend
npm run dev
```
API runs on `http://localhost:5000`.

#### 4. Start ML & Analytics Service (FastAPI)
```bash
cd ml-service
python -m uvicorn main:app --reload --port 8000
```
ML Service runs on `http://localhost:8000`.

#### 5. Start React Frontend
```bash
cd frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## Pre-Seeded Student Personas

For effortless testing, use the **Persona Switcher** in the top navigation bar or log in with any of these pre-seeded accounts:

| Student Name | University Email | Role / Perspective | Seeded Password |
|---|---|---|---|
| **Rahul Sharma** | `rahul@lpu.in` | Top Seller (MacBook Air, ThinkPad, Calculator) | `password123` |
| **Sneha Patel** | `sneha@university.edu` | Seller (iPad 9th Gen Auction, Sony Headphones, Canvas Poster) | `password123` |
| **Amit Kumar** | `amit@lpu.in` | Active Buyer (Negotiating on MacBook, Seller for Cycle) | `password123` |
| **Priya Verma** | `priya@university.edu` | Buyer & Bidder (Won CLRS book, Bidding on Fest Pass) | `password123` |
| **Vikram Singh** | `vikram@campusx.edu` | Event Coordinator (Live Fest VIP Pass Auction, Nike Pegasus) | `password123` |

---

## API Reference

### Backend Routes (`http://localhost:5000/api`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/auth/send-otp` | Sends 6-digit OTP code to university email (TTL index) | No |
| `POST` | `/auth/verify-otp` | Validates OTP verification code | No |
| `POST` | `/auth/register` | Registers verified student (.edu, lpu.in, etc.) | No |
| `POST` | `/auth/login` | Authenticates student & returns 7-day JWT | No |
| `GET` | `/auth/me` | Current authenticated profile | Yes |
| `GET` | `/auth/sellers/:id` | Public seller rating and university status | No |
| `GET` | `/products` | Query products (`?q=&category=&condition=&min=&max=&sort=`) | No |
| `GET` | `/products/:id` | Product details + increments view counter | Optional |
| `POST` | `/products` | Creates listing with category attributes | Yes |
| `PATCH` | `/products/:id` | Updates listing details | Yes |
| `DELETE`| `/products/:id` | Removes available listing | Yes |
| `GET` | `/products/mine/private` | Returns seller listings with private `minimum_price` | Yes |
| `GET` | `/negotiations` | Lists current user's negotiations | Yes |
| `POST` | `/negotiations` | Opens negotiation with initial offer | Yes |
| `POST` | `/negotiations/:id/offer` | Proposes alternating counter-offer | Yes |
| `POST` | `/negotiations/:id/accept`| Accepts offer, reserves item, creates order | Yes |
| `POST` | `/negotiations/:id/reject`| Rejects and closes negotiation | Yes |
| `GET` | `/negotiations/:id/chat` | Fetches message history | Yes |
| `POST` | `/negotiations/:id/chat` | Sends chat message (REST fallback) | Yes |
| `GET` | `/auctions` | Active live auctions sorted by end time | No |
| `GET` | `/auctions/:id` | Auction details with top 30 bid history | No |
| `POST` | `/auctions` | Lists product for live timed auction | Yes |
| `POST` | `/auctions/:id/bid` | Atomic conditional bid update | Yes |
| `POST` | `/orders/buy/:productId` | Direct purchase for fixed price item | Yes |
| `GET` | `/orders` | User orders (as buyer or seller) | Yes |
| `POST` | `/orders/:id/pay` | Generates payment order (mock or Razorpay) | Yes |
| `POST` | `/orders/:id/verify` | Signature verification + issues receipt | Yes |
| `GET` | `/orders/:id/receipt.pdf`| Downloads PDFKit receipt | Yes |
| `GET` | `/orders/:id/receipt` | JSON receipt for in-app invoice modal | Yes |
| `GET` | `/orders/:id/contact` | Releases seller/buyer contact after payment | Yes |
| `POST` | `/orders/:id/meeting` | Sets campus handover location & time | Yes |
| `POST` | `/orders/:id/confirm` | Both parties confirm physical handover | Yes |
| `POST` | `/reviews` | Verified purchase review (1-5 stars) | Yes |
| `POST` | `/upload` | Multipart image upload (Cloudinary / Local) | Yes |

### ML & Analytics Routes (`http://localhost:8000`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/trust/{user_id}` | Bayesian trust score (0-100) |
| `GET` | `/recommend/{user_id}` | Hybrid TF-IDF + Collaborative recommendations |
| `GET` | `/analytics/category-stats` | Category volume, view count, average prices |
| `GET` | `/analytics/monthly-revenue` | Monthly escrow volume & orders |
| `GET` | `/analytics/top-sellers` | Top sellers leaderboard |
| `GET` | `/analytics/auction-success-rate` | Active vs ended auction rates |
| `GET` | `/analytics/high-views-low-conversion` | High views with low conversions |
