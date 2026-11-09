import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import MarketplaceView from './components/MarketplaceView';
import LiveAuctionView from './components/LiveAuctionView';
import OfferChatView from './components/OfferChatView';
import OrdersView from './components/OrdersView';
import AnalyticsView from './components/AnalyticsView';
import AuthModal from './components/AuthModal';
import CreateListingModal from './components/CreateListingModal';
import InvoiceModal from './components/InvoiceModal';
import { api, getCurrentUser, setCurrentUser, setAuthToken, resetSocket } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('marketplace');
  const [user, setUser] = useState(getCurrentUser());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [invoiceModalOrderId, setInvoiceModalOrderId] = useState(null);

  // Cross-view contextual state
  const [targetAuctionId, setTargetAuctionId] = useState(null);
  const [activeNegotiationId, setActiveNegotiationId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Auto-login to demo user Rahul on initial launch if none is set
  useEffect(() => {
    if (!user) {
      handleSwitchUser('rahul@lpu.in', 'password123');
    }
  }, []);

  async function handleSwitchUser(email, password) {
    try {
      const res = await api.login(email, password);
      setAuthToken(res.token);
      setCurrentUser(res.user);
      setUser(res.user);
      resetSocket();
    } catch (err) {
      console.warn('Auto-login fallback:', err);
    }
  }

  function handleLogout() {
    setAuthToken(null);
    setCurrentUser(null);
    setUser(null);
    resetSocket();
  }

  function handleAuthSuccess(authUser, token) {
    setAuthToken(token);
    setCurrentUser(authUser);
    setUser(authUser);
    resetSocket();
  }

  // Handle direct buy of fixed price item
  async function handleBuyFixed(productId) {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    try {
      const order = await api.buyFixed(productId);
      alert('Order created! Please complete payment in the Orders tab to hold funds in escrow.');
      setActiveTab('orders');
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenCreateListing={() => {
          if (!user) setAuthModalOpen(true);
          else setCreateModalOpen(true);
        }}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'marketplace' && (
          <MarketplaceView
            user={user}
            refreshKey={refreshKey}
            onOpenNegotiation={(negId) => {
              setActiveNegotiationId(negId);
              setActiveTab('negotiations');
            }}
            onOpenAuction={(auctionId) => {
              setTargetAuctionId(auctionId);
              setActiveTab('auctions');
            }}
            onBuyFixed={handleBuyFixed}
            onRequireAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'auctions' && (
          <LiveAuctionView
            user={user}
            targetAuctionId={targetAuctionId}
            onRequireAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'negotiations' && (
          <OfferChatView
            user={user}
            activeNegotiationId={activeNegotiationId}
            onOrderCreated={(orderId) => {
              alert('Offer accepted! Your order has been generated.');
              setActiveTab('orders');
            }}
            onRequireAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersView
            user={user}
            onViewInvoice={(orderId) => setInvoiceModalOrderId(orderId)}
            onRequireAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView />
        )}
      </main>

      {/* Global Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <CreateListingModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => {
          setRefreshKey((k) => k + 1);
          alert('Listing successfully published to CampusX!');
          setActiveTab('marketplace');
        }}
        onRequireAuth={() => setAuthModalOpen(true)}
      />

      <InvoiceModal
        orderId={invoiceModalOrderId}
        onClose={() => setInvoiceModalOrderId(null)}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 CampusX. Official University Student Resale, Live Auctions & Escrow Platform.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Verified Student IDs Only</span>
            <span>•</span>
            <span>Razorpay / Mock Escrow</span>
            <span>•</span>
            <span>Bayesian Trust Prior</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

