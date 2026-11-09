import React, { useState } from 'react';
import { ShoppingBag, Gavel, MessageSquare, Receipt, BarChart3, PlusCircle, User, LogOut, ChevronDown, CheckCircle2, Sparkles } from 'lucide-react';
import { DEMO_STUDENTS } from '../api';

export default function Navbar({ activeTab, setActiveTab, user, onSwitchUser, onLogout, onOpenAuth, onOpenCreateListing }) {
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Tag */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('marketplace')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="font-extrabold text-xl text-white tracking-wider">CX</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight text-white">CampusX</span>
                <span className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Verified Campus
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Student Resale, Live Auctions & Escrow</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'marketplace'
                  ? 'bg-slate-800 text-indigo-400 border border-slate-700/60 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Marketplace
            </button>

            <button
              onClick={() => setActiveTab('auctions')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                activeTab === 'auctions'
                  ? 'bg-slate-800 text-amber-400 border border-slate-700/60 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Gavel className="w-4 h-4" />
              Live Auctions
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('negotiations')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'negotiations'
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700/60 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Bargaining & Chats
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'orders'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700/60 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Receipt className="w-4 h-4" />
              Orders & Invoices
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-slate-800 text-purple-400 border border-slate-700/60 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              ML Analytics
            </button>
          </nav>

          {/* Right Actions: Sell Item + Persona Switcher / Auth */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenCreateListing}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Sell Item
            </button>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 hover:border-slate-600 transition-all text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs border border-indigo-500/30">
                    {user.name.charAt(0)}
                  </div>
                  <div className="hidden lg:block">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-white max-w-[100px] truncate">{user.name}</span>
                      {user.student_verified && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" title="Verified Student" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 truncate block max-w-[120px]">{user.university || 'Campus'}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showPersonaMenu && (
                  <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl p-2 z-50">
                    <div className="px-3 py-2 border-b border-slate-700/60 mb-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" /> Switch Demo Student Persona
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Quickly toggle between buyer & seller accounts</p>
                    </div>

                    <div className="space-y-1">
                      {DEMO_STUDENTS.map((s) => (
                        <button
                          key={s.email}
                          onClick={() => {
                            setShowPersonaMenu(false);
                            onSwitchUser(s.email, 'password123');
                          }}
                          className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                            user.email === s.email ? 'bg-indigo-600/20 text-indigo-300 font-medium border border-indigo-500/30' : 'hover:bg-slate-700/50 text-slate-300'
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[11px] font-bold mt-0.5 shrink-0">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{s.name}</div>
                            <div className="text-[10px] text-slate-400">{s.email}</div>
                            <div className="text-[10px] text-indigo-400 font-medium">{s.role}</div>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-slate-700/60 mt-2 pt-1">
                      <button
                        onClick={() => {
                          setShowPersonaMenu(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                <User className="w-3.5 h-3.5" /> Student Login
              </button>
            )}
          </div>
        </div>

        {/* Mobile Submenu Tabs */}
        <div className="flex md:hidden items-center justify-between py-2 border-t border-slate-800 text-xs overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'marketplace' ? 'bg-slate-800 text-indigo-400 font-semibold' : 'text-slate-400'}`}
          >
            Market
          </button>
          <button
            onClick={() => setActiveTab('auctions')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'auctions' ? 'bg-slate-800 text-amber-400 font-semibold' : 'text-slate-400'}`}
          >
            Live Auctions
          </button>
          <button
            onClick={() => setActiveTab('negotiations')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'negotiations' ? 'bg-slate-800 text-cyan-400 font-semibold' : 'text-slate-400'}`}
          >
            Bargaining
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'orders' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-400'}`}
          >
            Orders
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'analytics' ? 'bg-slate-800 text-purple-400 font-semibold' : 'text-slate-400'}`}
          >
            ML Insights
          </button>
          <button
            onClick={onOpenCreateListing}
            className="px-2.5 py-1 rounded whitespace-nowrap bg-indigo-600 text-white font-semibold"
          >
            + Sell
          </button>
        </div>
      </div>
    </header>
  );
}

