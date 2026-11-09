import React, { useState } from 'react';
import { X, Mail, Lock, User, Phone, School, Sparkles, KeyRound, CheckCircle, AlertCircle } from 'lucide-react';
import { api, DEMO_STUDENTS } from '../api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [university, setUniversity] = useState('Lovely Professional University');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtpHint, setDevOtpHint] = useState('');

  if (!isOpen) return null;

  async function handleSendOtp() {
    if (!email) {
      setError('Please enter your university email first');
      return;
    }
    setError('');
    setSuccessMsg('');
    try {
      setLoading(true);
      const res = await api.sendOtp(email, 'register');
      setSuccessMsg(res.message || 'OTP verification code sent!');
      if (res.dev_otp) {
        setDevOtpHint(res.dev_otp);
        setOtp(res.dev_otp); // autofill for effortless developer / student testing
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.register({
          name,
          email,
          password,
          university,
          phone,
          otp,
        });
        onAuthSuccess(res.user, res.token);
        onClose();
      } else {
        const res = await api.login(email, password);
        onAuthSuccess(res.user, res.token);
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickLogin(demoEmail) {
    setError('');
    setLoading(true);
    try {
      const res = await api.login(demoEmail, 'password123');
      onAuthSuccess(res.user, res.token);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <School className="w-3.5 h-3.5" /> University Student Portal
          </div>
          <h2 className="text-xl font-bold text-white">
            {isRegister ? 'Create Your Account' : 'Welcome Back to CampusX'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRegister
              ? 'Register with any personal or university email to buy, sell, and bid on campus'
              : 'Sign in to access student resale, auctions, and escrow orders'}
          </p>
        </div>

        {/* Error / Success Alerts */}
        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 flex items-center gap-2 p-3 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">Email Address</label>
              {isRegister && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Send OTP Code
                </button>
              )}
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                placeholder="yourname@gmail.com or student@lpu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email Verification OTP {devOtpHint && <span className="text-emerald-400 font-bold">(Dev Code: {devOtpHint})</span>}
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="6-digit verification code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">University / Campus</label>
                  <input
                    type="text"
                    placeholder="e.g. LPU, IIT, NIT"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Phone (Private)</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all"
          >
            {loading ? 'Please wait...' : isRegister ? 'Register & Verify Student' : 'Sign In'}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setSuccessMsg('');
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            {isRegister ? 'Already registered? Sign in here' : "Don't have an account? Sign up with university email"}
          </button>
        </div>

        {/* Quick Demo Student Switcher */}
        <div className="mt-6 pt-4 border-t border-slate-800">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Quick Test Student Logins:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DEMO_STUDENTS.slice(0, 4).map((s) => (
              <button
                key={s.email}
                type="button"
                onClick={() => handleQuickLogin(s.email)}
                className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700/80 transition-colors"
              >
                {s.name.split(' ')[0]} ({s.role.split(' ')[0]})
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

