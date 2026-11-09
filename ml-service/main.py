"""CampusX analytics + recommendation service (FastAPI + PyMongo)."""
import os
from collections import Counter

import numpy as np
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

load_dotenv()
mongo_uri = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017/campusx")
client = MongoClient(mongo_uri)
try:
    db = client.get_default_database()
except Exception:
    db = client["campusx"]

app = FastAPI(title="CampusX ML & Analytics Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def clean(x):
    """Make Mongo results JSON-safe (ObjectId -> str)."""
    if isinstance(x, list):
        return [clean(i) for i in x]
    if isinstance(x, dict):
        return {k: clean(v) for k, v in x.items()}
    return str(x) if isinstance(x, ObjectId) else x


@app.get("/")
def health():
    return {"status": "ok", "service": "CampusX ML & Analytics"}


# ---------- Seller trust score (weights from design; Bayesian prior for fairness) ----------
W = dict(rating=0.30, quality=0.25, completed=0.15, success=0.15, verified=0.10, response=0.05)
PRIOR_MEAN, PRIOR_WEIGHT = 3.5, 5  # Bayesian prior so new sellers are not punished


def trust_score(u: dict) -> float:
    if not u or "_id" not in u:
        return 50.0
    n = u.get("rating", {}).get("total_reviews", 0) or 0
    avg = u.get("rating", {}).get("average", 0) or 0
    bayes = (n * avg + PRIOR_WEIGHT * PRIOR_MEAN) / (n + PRIOR_WEIGHT)

    q = list(
        db.reviews.aggregate([
            {"$match": {"reviewed_user_id": u["_id"], "product_quality_rating": {"$exists": True}}},
            {"$group": {"_id": None, "q": {"$avg": "$product_quality_rating"}, "n": {"$sum": 1}}},
        ])
    )
    qn, qavg = (q[0]["n"], q[0]["q"]) if q else (0, 0)
    qbayes = (qn * qavg + PRIOR_WEIGHT * PRIOR_MEAN) / (qn + PRIOR_WEIGHT)

    s = u.get("stats", {}) or {}
    listed = db.orders.count_documents({"seller_id": u["_id"]})
    done = s.get("completed_sales", 0) or 0
    offers_recv = s.get("offers_received", 0) or 0
    offers_rep = s.get("offers_replied", 0) or 0

    parts = dict(
        rating=bayes / 5 * 100,
        quality=qbayes / 5 * 100,
        completed=min(done, 20) / 20 * 100,
        success=(done / listed * 100) if listed else 50.0,
        verified=100.0 if u.get("student_verified") else 0.0,
        response=(offers_rep / offers_recv * 100) if offers_recv else 50.0,
    )
    return round(sum(W[k] * v for k, v in parts.items()), 2)


@app.get("/trust/{user_id}")
def trust(user_id: str):
    try:
        u = db.users.find_one({"_id": ObjectId(user_id)})
        return {"user_id": user_id, "trust_score": trust_score(u) if u else 50.0}
    except Exception as e:
        return {"user_id": user_id, "trust_score": 50.0, "error": str(e)}


# ---------- Recommendations: FinalScore = 0.40C + 0.30T + 0.20P + 0.10Q ----------
@app.get("/recommend/{user_id}")
def recommend(user_id: str, limit: int = 10):
    try:
        uid = ObjectId(user_id)
    except Exception:
        return []

    prods = list(db.products.find({"status": "available", "seller_id": {"$ne": uid}}))
    if not prods:
        return []

    events = list(db.user_events.find({"user_id": uid, "product_id": {"$exists": True}}))
    seen = {e["product_id"] for e in events if e.get("product_id")}

    def text(p):
        return f"{p.get('title','')} {p.get('description','')} {p.get('category','')} {p.get('subcategory','')}".strip()

    allp = prods + list(db.products.find({"_id": {"$in": list(seen)}}))
    
    C = np.zeros(len(prods))
    try:
        corpus = [text(p) for p in allp]
        if any(corpus):
            vec = TfidfVectorizer(stop_words="english").fit_transform(corpus)
            liked_idx = [i for i, p in enumerate(allp) if p["_id"] in seen]
            if liked_idx:
                C = cosine_similarity(vec[: len(prods)], vec[liked_idx]).max(axis=1)
    except Exception as e:
        print("[TF-IDF fallback]", e)

    peers = db.user_events.distinct("user_id", {"product_id": {"$in": list(seen)}, "user_id": {"$ne": uid}}) if seen else []
    cf = Counter(e["product_id"] for e in db.user_events.find({"user_id": {"$in": peers}}))
    cfmax = max(cf.values(), default=1)

    views = np.array([float(p.get("views", 0) or 0) for p in prods], float)
    P = views / views.max() if views.max() > 0 else views

    seller_ids = list({p["seller_id"] for p in prods if "seller_id" in p})
    sellers = {u["_id"]: u for u in db.users.find({"_id": {"$in": seller_ids}})}
    
    T = np.array([trust_score(sellers.get(p.get("seller_id"), {})) / 100 for p in prods])
    Q = np.array([sellers.get(p.get("seller_id"), {}).get("rating", {}).get("average", 3.5) / 5 for p in prods])
    C = 0.7 * C + 0.3 * np.array([cf.get(p["_id"], 0) / cfmax for p in prods])

    score = 0.40 * C + 0.30 * T + 0.20 * P + 0.10 * Q
    order = np.argsort(-score)[:limit]

    return [
        {
            "product_id": str(prods[i]["_id"]),
            "title": prods[i].get("title", "Item"),
            "price": prods[i].get("price", 0),
            "category": prods[i].get("category", "General"),
            "images": prods[i].get("images", []),
            "condition": prods[i].get("condition", "Good"),
            "score": round(float(score[i]), 4),
        }
        for i in order
    ]


# ---------- Analytics dashboard (MongoDB aggregation pipelines) ----------
@app.get("/analytics/category-stats")
def category_stats():
    return clean(
        list(
            db.products.aggregate([
                {
                    "$group": {
                        "_id": "$category",
                        "listings": {"$sum": 1},
                        "avg_price": {"$avg": "$price"},
                        "views": {"$sum": "$views"},
                    }
                },
                {"$sort": {"listings": -1}},
            ])
        )
    )


@app.get("/analytics/monthly-revenue")
def monthly_revenue():
    return clean(
        list(
            db.orders.aggregate([
                {"$match": {"status": {"$in": ["paid", "completed"]}}},
                {
                    "$group": {
                        "_id": {"$dateToString": {"format": "%Y-%m", "date": "$created_at"}},
                        "revenue": {"$sum": "$amount"},
                        "orders": {"$sum": 1},
                    }
                },
                {"$sort": {"_id": 1}},
            ])
        )
    )


@app.get("/analytics/top-sellers")
def top_sellers():
    results = list(
        db.orders.aggregate([
            {"$match": {"status": "completed"}},
            {"$group": {"_id": "$seller_id", "sales": {"$sum": 1}, "revenue": {"$sum": "$amount"}}},
            {"$sort": {"sales": -1}},
            {"$limit": 10},
        ])
    )
    # Populate seller names
    for item in results:
        user = db.users.find_one({"_id": item["_id"]}, {"name": 1, "university": 1, "rating": 1})
        item["seller_name"] = user.get("name", "Student Seller") if user else "Student Seller"
        item["university"] = user.get("university", "") if user else ""
        item["rating"] = user.get("rating", {}).get("average", 0) if user else 0
    return clean(results)


@app.get("/analytics/auction-success-rate")
def auction_rate():
    return clean(list(db.auctions.aggregate([{"$group": {"_id": "$status", "count": {"$sum": 1}}}])))


@app.get("/analytics/high-views-low-conversion")
def low_conversion():
    return clean(
        list(
            db.products.find(
                {"status": "available", "views": {"$gt": 10}},
                {"title": 1, "views": 1, "price": 1, "category": 1},
            )
            .sort("views", -1)
            .limit(10)
        )
    )
