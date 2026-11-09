import React, { useState, useEffect } from 'react';
import { Gavel, Clock, Trophy, AlertCircle, Sparkles, CheckCircle2, TrendingUp, History, ArrowUpRight } from 'lucide-react';
import { api, getSocket } from '../api';

export default function LiveAuctionView({ user, targetAuctionId, onRequireAuth }) {
  const [auctions, setAuctions] = useState([]);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [bidding, setBidding] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0, ended: false });

  // Load all active auctions
  useEffect(() => {
    loadAuctions();
  }, []);

  // Set up socket listener for live bids
  useEffect(() => {
    if (!selectedAuction) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('join_auction', selectedAuction._id);
      
      const onBid = (newBidEvent) => {
        if (newBidEvent.auction_id === selectedAuction._id) {
          setSelectedAuction((prev) => ({
            ...prev,
            current_highest_bid: newBidEvent.amount,
            highest_bidder_id: { name: newBidEvent.bidder_name || 'Verified Student' },
          }));
          // Add to bids feed
          setBids((prev) => [
            {
              _id: 'live-' + Date.now(),
              bid_amount: newBidEvent.amount,
              bidder_id: { name: newBidEvent.bidder_name || 'Verified Student' },
              created_at: new Date(),
            },
            ...prev,
          ]);
        }
      };

      const onClosed = () => {
        loadAuctionDetails(selectedAuction._id);
      };

      socket.on('bid', onBid);
      socket.on('auction_closed', onClosed);

      return () => {
        socket.off('bid', onBid);
        socket.off('auction_closed', onClosed);
      };
    }
  }, [selectedAuction?._id]);

  // Countdown timer effect
  useEffect(() => {
    if (!selectedAuction || !selectedAuction.end_time) return;

    function updateTimer() {
      const diff = new Date(selectedAuction.end_time) - new Date();
      if (diff <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0, ended: true });
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeRemaining({ hours, minutes, seconds, ended: false });
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [selectedAuction?.end_time]);

  async function loadAuctions() {
    try {
      setLoading(true);
      const list = await api.getAuctions();
      setAuctions(list);
      if (list.length > 0) {
        const initial = targetAuctionId
          ? list.find((a) => a._id === targetAuctionId || a.product_id?._id === targetAuctionId) || list[0]
          : list[0];
        loadAuctionDetails(initial._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadAuctionDetails(id) {
    try {
      const data = await api.getAuction(id);
      setSelectedAuction(data.auction);
      setBids(data.bids || []);
      const nextSuggested = (data.auction.current_highest_bid || data.auction.starting_price || 0) + 100;
      setBidAmount(String(nextSuggested));
      setErrorMsg('');
    } catch (err) {
      console.error(err);
    }
  }

  async function handlePlaceBid(e) {
    if (e) e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    const val = Number(bidAmount);
    if (!val || val <= selectedAuction.current_highest_bid) {
      setErrorMsg(`Bid must be strictly higher than current ₹${selectedAuction.current_highest_bid}`);
      return;
    }

    try {
      setBidding(true);
      setErrorMsg('');
      const updated = await api.placeBid(selectedAuction._id, val);
      setSelectedAuction(updated);
      setBidAmount(String(val + 100));
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setBidding(false);
    }
  }

  function handleQuickIncrement(inc) {
    const base = selectedAuction?.current_highest_bid || selectedAuction?.starting_price || 0;
    setBidAmount(String(base + inc));
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-slate-400">Connecting to live auction house...</p>
      </div>
    );
  }

  if (auctions.length === 0) {
    return (
      <div className="py-16 text-center bg-slate-900/60 border border-slate-800 rounded-3xl p-8 max-w-xl mx-auto">
        <Gavel className="w-12 h-12 text-amber-500/60 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white">No Active Live Auctions Right Now</h2>
        <p className="text-xs text-slate-400 mt-1">
          When students list items as "Live Auction", they will appear here with atomic real-time bidding.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Gavel className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white">Live Campus Auction Room</h1>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span> Live WebSocket
              </span>
            </div>
            <p className="text-xs text-slate-400">Atomic single conditional update guarantee (no race conditions)</p>
          </div>
        </div>

        {/* Auctions Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full">
          {auctions.map((a) => (
            <button
              key={a._id}
              onClick={() => loadAuctionDetails(a._id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedAuction?._id === a._id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
              }`}
            >
              {a.product_id?.title?.slice(0, 24) || 'Auction'}...
            </button>
          ))}
        </div>
      </div>

      {selectedAuction && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Product Spotlight & Timer (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Main Product Card */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-3xl overflow-hidden shadow-xl">
              <div className="relative aspect-[16/10] bg-slate-950">
                <img
                  src={selectedAuction.product_id?.images?.[0] || 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800'}
                  alt={selectedAuction.product_id?.title}
                  className="w-full h-full object-cover"
                />
                
                {/* Floating Countdown Pill */}
                <div className="absolute top-4 right-4 px-4 py-2 rounded-2xl bg-black/80 backdrop-blur-md border border-white/10 shadow-2xl flex items-center gap-3 text-white">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  {timeRemaining.ended ? (
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Auction Ended</span>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">{String(timeRemaining.hours).padStart(2, '0')}h</span>
                      <span>:</span>
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">{String(timeRemaining.minutes).padStart(2, '0')}m</span>
                      <span>:</span>
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">{String(timeRemaining.seconds).padStart(2, '0')}s</span>
                    </div>
                  )}
                </div>

                {/* Category tag */}
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500 text-slate-950">
                    {selectedAuction.product_id?.category || 'Auction'}
                  </span>
                </div>
              </div>

              {/* Title & Info */}
              <div className="p-6">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  {selectedAuction.product_id?.title}
                </h2>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {selectedAuction.product_id?.description}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                  <div>
                    <span>Listed by: </span>
                    <span className="font-semibold text-white">{selectedAuction.seller_id?.name || 'Verified Student'}</span>
                  </div>
                  <div>
                    <span>Starting Bid: </span>
                    <span className="font-semibold text-white">₹{selectedAuction.starting_price?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Bids Feed Table */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-3xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-400" /> Live Bid History
                </h3>
                <span className="text-[11px] text-slate-400">{bids.length} total bids placed</span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {bids.map((b, idx) => (
                  <div
                    key={b._id || idx}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                      idx === 0
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        : 'bg-slate-900/50 border-slate-700/40 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {idx === 0 ? (
                        <Trophy className="w-4 h-4 text-amber-400" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                      )}
                      <span className="font-semibold">{b.bidder_id?.name || 'Student Bidder'}</span>
                      {idx === 0 && (
                        <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                          Highest Bid
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-white">₹{b.bid_amount?.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Bid Control Terminal (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Live Highest Bid Display */}
            <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
                <span>Current Highest Bid</span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Reserve Met
                </span>
              </div>

              <div className="text-4xl sm:text-5xl font-black text-white tracking-tight font-mono">
                ₹{selectedAuction.current_highest_bid?.toLocaleString()}
              </div>

              <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
                <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-slate-400">Current Leader:</span>
                <span className="font-bold text-white">
                  {selectedAuction.highest_bidder_id?.name || 'No bids yet'}
                </span>
              </div>

              {/* Bid Form */}
              <form onSubmit={handlePlaceBid} className="mt-6 space-y-4">
                {errorMsg && (
                  <div className="flex items-center gap-2 p-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Your Bid Amount (₹)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={selectedAuction.current_highest_bid + 1}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      disabled={timeRemaining.ended}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-lg font-bold text-white font-mono focus:outline-none focus:border-amber-500 shadow-inner"
                    />
                  </div>
                </div>

                {/* Quick Increment Chips */}
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">Quick Bid Boosts:</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[50, 100, 250, 500].map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => handleQuickIncrement(inc)}
                        className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold rounded-lg border border-slate-700/80 transition-colors"
                      >
                        +{inc}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={bidding || timeRemaining.ended}
                  className="w-full py-3.5 rounded-xl text-sm font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <Gavel className="w-4 h-4" />
                  {bidding ? 'Submitting Bid...' : timeRemaining.ended ? 'Auction Closed' : `Place Atomic Bid (₹${Number(bidAmount || 0).toLocaleString()})`}
                </button>
              </form>

              <p className="mt-4 text-[11px] text-slate-400 text-center">
                Bids are pushed live to all connected campus peers over Socket.IO. Winner automatically claims order on auction settlement.
              </p>
            </div>

            {/* Auction Safety Guarantee Card */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2 text-xs text-slate-300">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Atomic Bidding Guarantee
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                CampusX runs atomic conditional MongoDB updates. Two simultaneous bidders can never win at the same amount. If outbid, you can immediately re-bid.
              </p>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

