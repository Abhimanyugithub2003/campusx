import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, CheckCircle2, XCircle, ArrowRightLeft, ShieldAlert, Sparkles, User, Tag, Clock } from 'lucide-react';
import { api, getSocket } from '../api';

export default function OfferChatView({ user, activeNegotiationId, onOrderCreated, onRequireAuth }) {
  const [negotiations, setNegotiations] = useState([]);
  const [selectedId, setSelectedId] = useState(activeNegotiationId || null);
  const [negotiation, setNegotiation] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [counterAmount, setCounterAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadNegotiations();
  }, [user]);

  useEffect(() => {
    if (activeNegotiationId) {
      setSelectedId(activeNegotiationId);
    }
  }, [activeNegotiationId]);

  useEffect(() => {
    if (selectedId) {
      loadNegotiationDetails(selectedId);
    }
  }, [selectedId]);

  // Set up live Socket.IO connection for chat messages and offers
  useEffect(() => {
    if (!selectedId) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('join_chat', selectedId);

      const onChatMessage = (msg) => {
        if (msg.negotiation_id === selectedId) {
          setChatMessages((prev) => [...prev, msg]);
          scrollToBottom();
        }
      };

      const onOfferEvent = (data) => {
        if (data.negotiation_id === selectedId) {
          loadNegotiationDetails(selectedId);
        }
      };

      socket.on('chat', onChatMessage);
      socket.on('offer', onOfferEvent);

      return () => {
        socket.off('chat', onChatMessage);
        socket.off('offer', onOfferEvent);
      };
    }
  }, [selectedId]);

  function scrollToBottom() {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  async function loadNegotiations() {
    try {
      setLoading(true);
      const list = await api.getNegotiations();
      setNegotiations(list);
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0]._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadNegotiationDetails(id) {
    try {
      const [negData, messages] = await Promise.all([api.getNegotiation(id), api.getChat(id)]);
      setNegotiation(negData);
      setChatMessages(messages || []);
      const last = negData.offers?.[negData.offers.length - 1];
      if (last) {
        setCounterAmount(String(last.amount));
      }
      scrollToBottom();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSendChat(e) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedId) return;
    const socket = getSocket();
    const text = newMessage.trim();
    setNewMessage('');

    if (socket && socket.connected) {
      socket.emit('chat', { negotiation_id: selectedId, text });
    } else {
      // Fallback to REST
      try {
        const sent = await api.sendChatMessage(selectedId, text);
        setChatMessages((prev) => [...prev, sent]);
        scrollToBottom();
      } catch (err) {
        alert(err.message);
      }
    }
  }

  async function handleCounterOffer(e) {
    e.preventDefault();
    const val = Number(counterAmount);
    if (!val || val <= 0) return;
    try {
      setActionLoading(true);
      const updated = await api.sendCounterOffer(selectedId, val);
      setNegotiation(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAccept() {
    if (!confirm('Accept this offer and create the order? This will reserve the product for you.')) return;
    try {
      setActionLoading(true);
      const res = await api.acceptOffer(selectedId);
      setNegotiation(res.negotiation);
      if (res.order && onOrderCreated) {
        onOrderCreated(res.order._id);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!confirm('Reject and close this negotiation?')) return;
    try {
      setActionLoading(true);
      const res = await api.rejectOffer(selectedId);
      setNegotiation(res);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="py-20 text-center bg-slate-900/60 border border-slate-800 rounded-3xl p-8 max-w-md mx-auto">
        <MessageSquare className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white">Sign In to Bargain & Chat</h2>
        <p className="text-xs text-slate-400 mt-1 mb-4">
          Chat directly with verified student sellers and exchange counter-offers in real-time.
        </p>
        <button
          onClick={onRequireAuth}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          Student Sign In
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-slate-400">Loading your negotiations...</p>
      </div>
    );
  }

  if (negotiations.length === 0) {
    return (
      <div className="py-16 text-center bg-slate-900/60 border border-slate-800 rounded-3xl p-8 max-w-md mx-auto">
        <ArrowRightLeft className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white">No Active Bargaining Chats</h2>
        <p className="text-xs text-slate-400 mt-1">
          When you click "Make Offer" on any negotiable product in the marketplace, your negotiation session and live chat will appear here.
        </p>
      </div>
    );
  }

  const lastOffer = negotiation?.offers?.[negotiation.offers.length - 1];
  const isMyTurn = lastOffer && lastOffer.offered_by !== user.id && lastOffer.offered_by?._id !== user.id;
  const otherParty = negotiation?.buyer_id?._id === user.id ? negotiation?.seller_id : negotiation?.buyer_id;

  return (
    <div className="space-y-4 pb-12">
      
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
            Bargaining & Live Offer Chat
          </h1>
          <p className="text-xs text-slate-400">Alternating counter-offers with real-time Socket.IO peer chat</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        
        {/* Left Column: Negotiations List (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-3 space-y-2 overflow-y-auto max-h-[650px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1 block">
            Your Active Negotiations ({negotiations.length})
          </span>

          {negotiations.map((n) => {
            const isSelected = n._id === selectedId;
            const last = n.offers?.[n.offers.length - 1];
            return (
              <div
                key={n._id}
                onClick={() => setSelectedId(n._id)}
                className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-slate-800 border-cyan-500/50 shadow-md'
                    : 'bg-slate-900 hover:bg-slate-800/60 border-slate-800 text-slate-400'
                }`}
              >
                <img
                  src={n.product_id?.images?.[0] || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=200'}
                  alt={n.product_id?.title}
                  className="w-14 h-14 rounded-xl object-cover bg-slate-800 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white truncate">{n.product_id?.title}</h4>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="font-bold text-cyan-400">
                      ₹{last ? last.amount?.toLocaleString() : n.agreed_amount?.toLocaleString() || n.product_id?.price?.toLocaleString()}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        n.negotiation_status === 'accepted'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : n.negotiation_status === 'rejected'
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {n.negotiation_status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Split Offer Timeline & Chat Box (8 cols) */}
        {negotiation ? (
          <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            
            {/* Header: Product details & Negotiating With */}
            <div className="p-4 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={negotiation.product_id?.images?.[0] || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=200'}
                  alt={negotiation.product_id?.title}
                  className="w-12 h-12 rounded-xl object-cover bg-slate-950 shrink-0"
                />
                <div>
                  <h3 className="text-sm font-bold text-white">{negotiation.product_id?.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>Listed at ₹{negotiation.product_id?.price?.toLocaleString()}</span>
                    <span>•</span>
                    <span>Chatting with <span className="font-semibold text-slate-200">{otherParty?.name || 'Student'}</span></span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Status</span>
                <span className={`text-xs font-bold uppercase ${negotiation.negotiation_status === 'accepted' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {negotiation.negotiation_status}
                </span>
              </div>
            </div>

            {/* Split Middle: Offer Timeline (Left) & Real-time Chat (Right) */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
              
              {/* Left Sub-panel: Offer History & Decision Actions */}
              <div className="p-4 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" /> Offer History Timeline
                  </h4>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {negotiation.offers?.map((off, idx) => {
                      const isMe = off.offered_by === user.id || off.offered_by?._id === user.id;
                      return (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                            isMe ? 'bg-indigo-950/30 border-indigo-500/20 text-indigo-200' : 'bg-slate-800/50 border-slate-700/40 text-slate-300'
                          }`}
                        >
                          <div>
                            <span className="font-bold text-white block">
                              {isMe ? 'You offered' : `${otherParty?.name || 'Partner'} offered`}
                            </span>
                            <span className="text-[10px] text-slate-400">{new Date(off.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-sm font-extrabold text-white">₹{off.amount?.toLocaleString()}</span>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">{off.status}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Offer Decision Actions */}
                {negotiation.negotiation_status === 'active' ? (
                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    {isMyTurn ? (
                      <>
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                          <Sparkles className="w-4 h-4 shrink-0" />
                          <span>Your turn! Accept the latest offer or propose a counter-offer below.</span>
                        </div>

                        {/* Accept Button */}
                        <button
                          onClick={handleAccept}
                          disabled={actionLoading}
                          className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Accept Offer of ₹{lastOffer?.amount?.toLocaleString()}
                        </button>

                        {/* Counter-Offer Form */}
                        <form onSubmit={handleCounterOffer} className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            value={counterAmount}
                            onChange={(e) => setCounterAmount(e.target.value)}
                            placeholder="Counter (₹)"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                          />
                          <button
                            type="submit"
                            disabled={actionLoading}
                            className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white whitespace-nowrap transition-colors"
                          >
                            Counter
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-400 text-center">
                        <Clock className="w-4 h-4 mx-auto mb-1 text-slate-500" />
                        Waiting for {otherParty?.name || 'the other party'} to respond to your offer of <span className="text-white font-bold font-mono">₹{lastOffer?.amount?.toLocaleString()}</span>.
                      </div>
                    )}

                    <button
                      onClick={handleReject}
                      disabled={actionLoading}
                      className="w-full py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      Reject Negotiation
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-800 text-xs text-center">
                    <span className="text-slate-400">Negotiation concluded as </span>
                    <span className="font-bold text-white uppercase">{negotiation.negotiation_status}</span>
                  </div>
                )}
              </div>

              {/* Right Sub-panel: Real-Time Chat Stream */}
              <div className="p-4 flex flex-col justify-between space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-400" /> Direct Student Chat
                </h4>

                {/* Messages Feed */}
                <div className="flex-1 space-y-2 max-h-72 overflow-y-auto pr-1">
                  {chatMessages.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500">
                      No messages yet. Send a message to coordinate questions or handover!
                    </div>
                  ) : (
                    chatMessages.map((m) => {
                      const isMe = m.sender_id === user.id || m.sender_id?._id === user.id;
                      return (
                        <div
                          key={m._id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs ${
                              isMe
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-tl-none'
                            }`}
                          >
                            <span className="block">{m.text}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 mt-0.5 px-1">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-slate-800">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message (e.g. Can you meet at Central Library?)..."
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>

            </div>

          </div>
        ) : null}

      </div>
    </div>
  );
}

