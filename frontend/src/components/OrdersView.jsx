import React, { useState, useEffect } from 'react';
import { Receipt, CheckCircle, Clock, MapPin, Phone, Mail, Download, Star, ExternalLink, ShieldCheck, AlertCircle, Calendar } from 'lucide-react';
import { api } from '../api';

export default function OrdersView({ user, onViewInvoice, onRequireAuth }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('all');
  const [contactData, setContactData] = useState({});
  const [meetingModalOrder, setMeetingModalOrder] = useState(null);
  const [meetingLocation, setMeetingLocation] = useState('Central Library (Floor 2)');
  const [meetingTime, setMeetingTime] = useState('');
  const [reviewModalOrder, setReviewModalOrder] = useState(null);
  const [sellerRating, setSellerRating] = useState(5);
  const [qualityRating, setQualityRating] = useState(5);
  const [commRating, setCommRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadOrders();
  }, [user]);

  async function loadOrders() {
    try {
      setLoading(true);
      const data = await api.getOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePay(orderId) {
    try {
      // Step 1: initiate payment
      const prep = await api.initiatePayment(orderId);
      // DEV mock mode verification
      if (prep.mock) {
        const verifyRes = await api.verifyPayment(orderId, { mock: true });
        alert(`Payment successful! Receipt generated: ${verifyRes.receipt?.receipt_no || 'CX-2026'}`);
        loadOrders();
      } else {
        alert('Razorpay order created with ID: ' + prep.gateway_order_id);
      }
    } catch (err) {
      alert('Payment failed: ' + err.message);
    }
  }

  async function handleShowContact(orderId) {
    try {
      const contact = await api.getContact(orderId);
      setContactData((prev) => ({ ...prev, [orderId]: contact }));
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleSaveMeeting(e) {
    e.preventDefault();
    if (!meetingModalOrder) return;
    try {
      await api.setMeeting(meetingModalOrder._id, meetingLocation, meetingTime);
      setMeetingModalOrder(null);
      loadOrders();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleConfirmHandover(orderId) {
    if (!confirm('Confirm that the item has been inspected and received in person?')) return;
    try {
      const res = await api.confirmHandover(orderId);
      alert(res.status === 'completed' ? 'Order completed! You can now write a verified review.' : 'Handover confirmed. Waiting for the other party to confirm.');
      loadOrders();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    if (!reviewModalOrder) return;
    try {
      setSubmittingReview(true);
      await api.createReview({
        order_id: reviewModalOrder._id,
        seller_rating: sellerRating,
        product_quality_rating: qualityRating,
        communication_rating: commRating,
        comment: reviewComment,
      });
      alert('Review submitted successfully! Thank you for maintaining campus trust.');
      setReviewModalOrder(null);
      setReviewComment('');
      loadOrders();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingReview(false);
    }
  }

  if (!user) {
    return (
      <div className="py-20 text-center bg-slate-900/60 border border-slate-800 rounded-3xl p-8 max-w-md mx-auto">
        <Receipt className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white">Sign In to View Orders & Receipts</h2>
        <p className="text-xs text-slate-400 mt-1 mb-4">Track paid orders, meeting places, and download PDF receipts.</p>
        <button
          onClick={onRequireAuth}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          Sign In
        </button>
      </div>
    );
  }

  const filteredOrders = orders.filter((o) => {
    if (filterTab === 'pending') return o.status === 'pending_payment';
    if (filterTab === 'paid') return o.status === 'paid';
    if (filterTab === 'completed') return o.status === 'completed';
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            My Orders & Escrow Invoices
          </h1>
          <p className="text-xs text-slate-400">Funds held securely in mock/Razorpay escrow until campus handover is confirmed</p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 text-xs">
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'pending', label: 'Pending Payment' },
            { id: 'paid', label: 'Paid & Meeting' },
            { id: 'completed', label: 'Completed' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterTab(t.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                filterTab === t.id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-400">Loading order records...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/60 border border-slate-800 rounded-3xl p-8 max-w-md mx-auto">
          <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Orders in this category</h3>
          <p className="text-xs text-slate-400 mt-1">
            Orders created via Instant Buy, Bargaining acceptances, or Auction wins will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((o) => {
            const isBuyer = o.buyer_id?._id === user.id || o.buyer_id === user.id;
            const otherUser = isBuyer ? o.seller_id : o.buyer_id;
            const contact = contactData[o._id];

            return (
              <div
                key={o._id}
                className="bg-slate-800/80 border border-slate-700/60 rounded-3xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-all"
              >
                {/* Left: Product & Info */}
                <div className="flex items-center gap-4">
                  <img
                    src={o.product_id?.images?.[0] || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=200'}
                    alt={o.product_id?.title}
                    className="w-16 h-16 rounded-2xl object-cover bg-slate-950 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                        {o.source}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          o.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : o.status === 'paid'
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {o.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white">{o.product_id?.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isBuyer ? 'Seller: ' : 'Buyer: '}
                      <span className="font-semibold text-slate-200">{otherUser?.name || 'Verified Student'}</span>
                      {' • '}
                      <span>{new Date(o.created_at).toLocaleDateString()}</span>
                    </p>

                    {/* Meeting point notice */}
                    {o.meeting?.location && (
                      <p className="text-xs text-indigo-300 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        Meeting at: <span className="font-medium text-white">{o.meeting.location}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Amount & Actions */}
                <div className="w-full md:w-auto flex flex-col sm:flex-row items-start sm:items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-700/60">
                  <div className="md:text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Order Amount</span>
                    <span className="text-xl font-extrabold text-emerald-400 font-mono">₹{o.amount?.toLocaleString()}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* If pending payment */}
                    {o.status === 'pending_payment' && isBuyer && (
                      <button
                        onClick={() => handlePay(o._id)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/30 transition-all"
                      >
                        Pay ₹{o.amount?.toLocaleString()} (DEV Mock / Razorpay)
                      </button>
                    )}

                    {/* If paid: release contact, meeting, confirm handover */}
                    {o.status === 'paid' && (
                      <>
                        <button
                          onClick={() => handleShowContact(o._id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 bg-slate-700 hover:bg-slate-600 transition-colors"
                        >
                          {contact ? `${contact.phone || contact.email}` : 'View Contact'}
                        </button>

                        <button
                          onClick={() => setMeetingModalOrder(o)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-colors"
                        >
                          Set Meeting
                        </button>

                        <button
                          onClick={() => handleConfirmHandover(o._id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            (isBuyer && o.buyer_confirmed) || (!isBuyer && o.seller_confirmed)
                              ? 'bg-slate-700 text-slate-400 cursor-default'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                          }`}
                        >
                          {(isBuyer && o.buyer_confirmed) || (!isBuyer && o.seller_confirmed)
                            ? 'Handover Confirmed ✓'
                            : 'Confirm Handover'}
                        </button>
                      </>
                    )}

                    {/* Completed: View Invoice, Download PDF, Review */}
                    {o.status === 'completed' && (
                      <>
                        <button
                          onClick={() => onViewInvoice(o._id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-700 hover:bg-slate-600 flex items-center gap-1 transition-colors"
                        >
                          <Receipt className="w-3.5 h-3.5" /> Invoice
                        </button>

                        <a
                          href={`/api/orders/${o._id}/receipt.pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 flex items-center gap-1 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </a>

                        {isBuyer && (
                          <button
                            onClick={() => setReviewModalOrder(o)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center gap-1 transition-colors"
                          >
                            <Star className="w-3.5 h-3.5 fill-amber-400" /> Write Review
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Campus Meeting Scheduler Modal */}
      {meetingModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-2">Schedule Campus Handover Point</h3>
            <p className="text-xs text-slate-400 mb-4">
              Select a well-lit, public campus location for item inspection and exchange.
            </p>

            <form onSubmit={handleSaveMeeting} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Campus Location</label>
                <select
                  value={meetingLocation}
                  onChange={(e) => setMeetingLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Central Library (Floor 2 Study Lounge)">Central Library (Floor 2 Study Lounge)</option>
                  <option value="Block 34 Cafeteria">Block 34 Cafeteria</option>
                  <option value="Food Court 2 Entrance">Food Court 2 Entrance</option>
                  <option value="Student Activity Center (SAC)">Student Activity Center (SAC)</option>
                  <option value="Main Campus Security Gate 1">Main Campus Security Gate 1</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Preferred Time</label>
                <input
                  type="datetime-local"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMeetingModalOrder(null)}
                  className="w-1/2 py-2 rounded-lg text-xs font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500"
                >
                  Save Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verified Review Modal */}
      {reviewModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-1">Verified Purchase Review</h3>
            <p className="text-xs text-slate-400 mb-4">
              Your rating updates the seller's Bayesian trust score and helps keep the student community safe.
            </p>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Seller Overall Rating (1 - 5 Stars)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSellerRating(star)}
                      className={`p-2 rounded-lg border ${sellerRating >= star ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                    >
                      <Star className={`w-5 h-5 ${sellerRating >= star ? 'fill-amber-400' : ''}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Product Quality Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setQualityRating(star)}
                      className={`p-1.5 rounded-md border text-xs ${qualityRating >= star ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                    >
                      {star} ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Communication & Punctuality</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setCommRating(star)}
                      className={`p-1.5 rounded-md border text-xs ${commRating >= star ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                    >
                      {star} ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Comment / Feedback</label>
                <textarea
                  required
                  rows="3"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="How was the condition of the item? Was the seller on time at the meeting place?"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOrder(null)}
                  className="w-1/2 py-2 rounded-lg text-xs font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-1/2 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300"
                >
                  {submittingReview ? 'Submitting...' : 'Post Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

