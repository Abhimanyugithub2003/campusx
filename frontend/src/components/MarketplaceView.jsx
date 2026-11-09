import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Tag, Star, CheckCircle, ShieldCheck, ArrowRight, Sparkles, MapPin, Eye, ShoppingCart, MessageCircle, Gavel, X, Trash2, User } from 'lucide-react';
import { api } from '../api';

const CATEGORIES = ['All', 'Laptops', 'Books', 'Cycles', 'Shoes', 'Tickets', 'Posters'];

export default function MarketplaceView({ user, refreshKey, onOpenNegotiation, onOpenAuction, onBuyFixed, onRequireAuth }) {
  const [products, setProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sellerTrust, setSellerTrust] = useState(null);
  const [showMyListings, setShowMyListings] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('All');
  const [sortBy, setSortBy] = useState('-created_at');
  const [priceMax, setPriceMax] = useState('');

  // Make offer modal state inside marketplace
  const [offerModalProduct, setOfferModalProduct] = useState(null);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerSubmitting, setOfferSubmitting] = useState(false);

  useEffect(() => {
    if (showMyListings && user) {
      loadMyListings();
    } else {
      loadProducts();
    }
  }, [selectedCategory, searchQuery, selectedCondition, sortBy, priceMax, showMyListings, refreshKey]);

  useEffect(() => {
    if (user && user.id) {
      loadRecommendations(user.id);
    }
  }, [user]);

  async function loadProducts() {
    try {
      setLoading(true);
      const params = {
        category: selectedCategory,
        q: searchQuery,
        condition: selectedCondition !== 'All' ? selectedCondition : undefined,
        sort: sortBy,
        max: priceMax || undefined,
      };
      const data = await api.getProducts(params);
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMyListings() {
    try {
      setLoading(true);
      const data = await api.getMyPrivateProducts();
      setProducts(data);
    } catch (err) {
      console.error('Failed to load your listings', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteProduct(id, e) {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this listing?')) return;
    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p._id !== id));
      alert('Listing removed successfully');
    } catch (err) {
      alert(err.message);
    }
  }

  async function loadRecommendations(userId) {
    try {
      const recs = await api.getRecommendations(userId);
      setRecommendations(recs);
    } catch (err) {
      console.warn('ML recommendations unavailable yet', err);
    }
  }

  async function handleOpenDetails(prod) {
    setSelectedProduct(prod);
    setSellerTrust(null);
    if (prod.seller_id?._id || prod.seller_id) {
      const sid = prod.seller_id?._id || prod.seller_id;
      try {
        const trustData = await api.getTrustScore(sid);
        setSellerTrust(trustData.trust_score);
      } catch {}
    }
  }

  async function submitOffer(e) {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!offerAmount || Number(offerAmount) <= 0) return;
    try {
      setOfferSubmitting(true);
      const res = await api.createNegotiation(offerModalProduct._id, Number(offerAmount));
      setOfferModalProduct(null);
      setOfferAmount('');
      onOpenNegotiation(res._id);
    } catch (err) {
      alert(err.message);
    } finally {
      setOfferSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      
      {/* Hero Banner with Search & Stats */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-slate-800 p-6 sm:p-8 lg:p-10 shadow-2xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Verified Student Marketplace with Escrow & AI Trust Score
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Buy & Sell On Campus with <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Complete Safety</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            Trade laptops, course textbooks, cycles, concert passes and dorm essentials with fellow verified students. Atomic live auctions, real-time counter-offers, and safe campus handover points.
          </p>

          {/* Search Box */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search MacBook, ThinkPad, CLRS algorithm book, cycle, shoes..."
                className="w-full pl-11 pr-4 py-3 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-inner"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full sm:w-auto px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="-created_at">Latest Listings</option>
              <option value="price">Price: Low to High</option>
              <option value="-price">Price: High to Low</option>
              <option value="-views">Most Popular</option>
            </select>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-20 w-72 h-72 rounded-full bg-purple-600/10 blur-3xl pointer-events-none"></div>
      </section>

      {/* ML Personalized Recommendations Carousel (if available) */}
      {recommendations && recommendations.length > 0 && (
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Recommended For You (AI Scored)
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">TF-IDF + Collaborative signals</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recommendations.slice(0, 3).map((rec) => (
              <div
                key={rec.product_id}
                onClick={() => api.getProduct(rec.product_id).then(handleOpenDetails)}
                className="group flex items-center gap-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:border-indigo-500/50 cursor-pointer transition-all"
              >
                <img
                  src={rec.images?.[0] || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=200'}
                  alt={rec.title}
                  className="w-16 h-16 rounded-lg object-cover bg-slate-700 shrink-0 group-hover:scale-105 transition-transform"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">{rec.category}</span>
                  <h3 className="text-xs font-bold text-white truncate">{rec.title}</h3>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-extrabold text-emerald-400">₹{rec.price?.toLocaleString()}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                      Match {(rec.score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Category Pills & Filters */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setShowMyListings(false);
                setSelectedCategory(cat);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                !showMyListings && selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
              }`}
            >
              {cat}
            </button>
          ))}

          {user && (
            <button
              onClick={() => setShowMyListings(!showMyListings)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                showMyListings
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-amber-400 border border-amber-500/30'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              {showMyListings ? 'Viewing: My Listings Only' : 'My Listings (Seller View)'}
            </button>
          )}
        </div>

        {/* Condition & Price Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Condition:</span>
          </div>
          {['All', 'New', 'Like New', 'Good', 'Fair'].map((cond) => (
            <button
              key={cond}
              onClick={() => setSelectedCondition(cond)}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                selectedCondition === cond
                  ? 'bg-slate-700 text-white font-medium border border-slate-600'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cond}
            </button>
          ))}
        </div>
      </section>

      {/* Product Grid */}
      <section>
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-slate-400">Loading campus listings...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center bg-slate-900/40 border border-slate-800 rounded-2xl p-8">
            <Tag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No listings found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Try adjusting your search query or category filters. You can also be the first to list an item in this category!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((p) => {
              const isOwner = user && p.seller_id && (p.seller_id._id === user.id || p.seller_id === user.id);
              return (
                <div
                  key={p._id}
                  className="group relative bg-slate-800/70 border border-slate-700/60 hover:border-slate-600 rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col"
                >
                  {/* Image Container */}
                  <div
                    onClick={() => handleOpenDetails(p)}
                    className="relative aspect-[4/3] bg-slate-900 overflow-hidden cursor-pointer"
                  >
                    <img
                      src={p.images?.[0] || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600'}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/10">
                        {p.category}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-950/80 backdrop-blur-md text-indigo-300 border border-indigo-500/30">
                        {p.condition}
                      </span>
                    </div>

                    {/* Listing Type Indicator */}
                    <div className="absolute bottom-2.5 right-2.5">
                      {p.listing_type === 'auction' ? (
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-amber-500 text-slate-950 flex items-center gap-1 shadow-md">
                          <Gavel className="w-3 h-3" /> Live Auction
                        </span>
                      ) : p.listing_type === 'negotiable' ? (
                        <span className="px-2 py-1 rounded-md text-[10px] font-semibold bg-cyan-950/80 backdrop-blur-md text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" /> Negotiable
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-md text-[10px] font-semibold bg-emerald-950/80 backdrop-blur-md text-emerald-300 border border-emerald-500/30">
                          Fixed Price
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Seller Tag */}
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-slate-300 truncate max-w-[120px]">
                            {p.seller_id?.name || 'Verified Student'}
                          </span>
                          {p.seller_id?.student_verified && (
                            <CheckCircle className="w-3 h-3 text-emerald-400" title="Student ID Verified" />
                          )}
                        </div>
                        {p.seller_id?.rating?.average > 0 && (
                          <div className="flex items-center gap-0.5 text-amber-400 text-xs font-semibold">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>{p.seller_id.rating.average.toFixed(1)}</span>
                          </div>
                        )}
                      </div>

                      {/* Title */}
                      <h3
                        onClick={() => handleOpenDetails(p)}
                        className="text-sm font-bold text-white hover:text-indigo-400 line-clamp-2 cursor-pointer transition-colors"
                      >
                        {p.title}
                      </h3>

                      {/* Location snippet */}
                      {p.location && (
                        <p className="flex items-center gap-1 text-[11px] text-slate-400 mt-1 truncate">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{p.location}</span>
                        </p>
                      )}
                    </div>

                    {/* Price & Action Row */}
                    <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Price</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-extrabold text-white">₹{p.price?.toLocaleString()}</span>
                          {isOwner && p.minimum_price && (
                            <span className="text-[10px] text-amber-400 font-mono">(Min ₹{p.minimum_price.toLocaleString()})</span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      {isOwner ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Your Listing
                          </span>
                          <button
                            onClick={(e) => handleDeleteProduct(p._id, e)}
                            title="Remove your listing"
                            className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : p.listing_type === 'auction' ? (
                        <button
                          onClick={() => onOpenAuction(p._id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1 transition-colors shadow-md shadow-amber-500/20"
                        >
                          <Gavel className="w-3.5 h-3.5" /> Bid
                        </button>
                      ) : p.listing_type === 'negotiable' ? (
                        <button
                          onClick={() => {
                            if (!user) onRequireAuth();
                            else {
                              setOfferModalProduct(p);
                              setOfferAmount(String(Math.round(p.price * 0.9)));
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> Offer
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (!user) onRequireAuth();
                            else onBuyFixed(p._id);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition-colors"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" /> Buy
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Image */}
              <div className="space-y-3">
                <div className="aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
                  <img
                    src={selectedProduct.images?.[0] || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600'}
                    alt={selectedProduct.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{selectedProduct.views || 0} students viewed this listing</span>
                </div>
              </div>

              {/* Details & Specs */}
              <div className="flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {selectedProduct.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
                      {selectedProduct.condition}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-white">{selectedProduct.title}</h2>
                  <p className="text-2xl font-extrabold text-emerald-400 mt-2">
                    ₹{selectedProduct.price?.toLocaleString()}
                  </p>

                  <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                    {selectedProduct.description || 'No description provided by student.'}
                  </p>

                  {/* Dynamic Category Attributes */}
                  {selectedProduct.attributes && Object.keys(selectedProduct.attributes).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Item Specifications</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(selectedProduct.attributes).map(([k, v]) => (
                          <div key={k} className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/50">
                            <span className="text-[10px] text-slate-400 block uppercase font-medium">{k.replace('_', ' ')}</span>
                            <span className="font-semibold text-white">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Seller Trust Pill */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Seller Trust</span>
                      <span className="text-xs font-semibold text-white">{selectedProduct.seller_id?.name}</span>
                      <span className="text-[10px] text-slate-400 block">{selectedProduct.seller_id?.university || 'Verified Campus'}</span>
                    </div>
                    {sellerTrust !== null && (
                      <div className="text-right">
                        <span className="text-base font-extrabold text-indigo-400">{sellerTrust} / 100</span>
                        <span className="text-[10px] text-emerald-400 block flex items-center gap-0.5 justify-end">
                          <ShieldCheck className="w-3 h-3" /> High Trust
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Action CTA */}
                <div className="pt-4 border-t border-slate-800">
                  {selectedProduct.listing_type === 'auction' ? (
                    <button
                      onClick={() => {
                        setSelectedProduct(null);
                        onOpenAuction(selectedProduct._id);
                      }}
                      className="w-full py-3 rounded-xl text-sm font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all"
                    >
                      <Gavel className="w-4 h-4" /> Go to Live Auction Room
                    </button>
                  ) : selectedProduct.listing_type === 'negotiable' ? (
                    <button
                      onClick={() => {
                        setSelectedProduct(null);
                        setOfferModalProduct(selectedProduct);
                        setOfferAmount(String(Math.round(selectedProduct.price * 0.9)));
                      }}
                      className="w-full py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
                    >
                      <MessageCircle className="w-4 h-4" /> Make Counter-Offer
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedProduct(null);
                        onBuyFixed(selectedProduct._id);
                      }}
                      className="w-full py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
                    >
                      <ShoppingCart className="w-4 h-4" /> Direct Purchase (₹{selectedProduct.price?.toLocaleString()})
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offer Negotiation Modal */}
      {offerModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
            <button
              onClick={() => setOfferModalProduct(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="text-xs font-semibold uppercase text-cyan-400">Offer & Bargaining</span>
              <h3 className="text-lg font-bold text-white mt-1">Make an Offer</h3>
              <p className="text-xs text-slate-400 mt-1">
                Item: <span className="text-white font-medium">{offerModalProduct.title}</span> (Listed at ₹{offerModalProduct.price?.toLocaleString()})
              </p>
            </div>

            <form onSubmit={submitOffer} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Your Proposed Offer Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-base font-bold text-white focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  The seller will receive a real-time notification to either accept, reject, or propose a counter-offer.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOfferModalProduct(null)}
                  className="w-1/2 py-2.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={offerSubmitting}
                  className="w-1/2 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all"
                >
                  {offerSubmitting ? 'Sending...' : 'Send Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

