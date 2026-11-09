import React, { useState, useEffect } from 'react';
import { X, Receipt, Download, CheckCircle, ShieldCheck, Printer } from 'lucide-react';
import { api } from '../api';

export default function InvoiceModal({ orderId, onClose }) {
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      loadReceipt();
    }
  }, [orderId]);

  async function loadReceipt() {
    try {
      setLoading(true);
      const data = await api.getReceipt(orderId);
      setReceipt(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (!orderId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">Fetching verified transaction receipt...</p>
          </div>
        ) : receipt ? (
          <div className="space-y-6">
            
            {/* Invoice Header */}
            <div className="text-center pb-4 border-b border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3 border border-indigo-500/30">
                <Receipt className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-extrabold text-white">CampusX Official Receipt</h2>
              <p className="text-xs text-slate-400">Digital Proof of University Student Transaction</p>
              
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <CheckCircle className="w-3.5 h-3.5" />
                Payment Verified & Recorded on Escrow
              </div>
            </div>

            {/* Receipt Summary Grid */}
            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/60 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                <span className="text-slate-400">Receipt Number</span>
                <span className="font-mono font-bold text-white text-sm">{receipt.receipt_no}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Date Issued</span>
                <span className="text-white font-medium">{new Date(receipt.created_at).toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Payment Reference</span>
                <span className="font-mono text-slate-300">{receipt.payment_ref}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Product Purchased</span>
                <span className="font-semibold text-white truncate max-w-[200px]">{receipt.product?.title}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Buyer</span>
                <span className="text-slate-200">{receipt.buyer_id?.name || 'Verified Student'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Seller</span>
                <span className="text-slate-200">{receipt.seller_id?.name || 'Verified Student'}</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
                <span className="text-sm font-bold text-white">Total Amount Paid</span>
                <span className="font-mono text-xl font-extrabold text-emerald-400">
                  ₹{receipt.amount?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Note & Action Buttons */}
            <div className="space-y-3">
              <p className="text-[11px] text-slate-500 text-center">
                Digital proof of transaction issued by CampusX. Payment confirmation is verified server-side with HMAC SHA256 signatures.
              </p>

              <div className="flex gap-2">
                <a
                  href={`/api/orders/${orderId}/receipt.pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4" /> Download Official PDF Receipt
                </a>
              </div>
            </div>

          </div>
        ) : (
          <div className="py-12 text-center text-xs text-rose-400">
            Receipt not found or not yet generated for this order.
          </div>
        )}

      </div>
    </div>
  );
}

