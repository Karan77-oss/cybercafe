import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, Mail, User, Phone, ArrowRight, 
  ShieldCheck, AlertCircle, Loader2, Sparkles 
} from 'lucide-react';
import { authApi } from '../api/client';

export default function Auth() {
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await authApi.login({ email, password });
      } else {
        await authApi.register({ 
          name, 
          email, 
          phone, 
          password,
          role: 'CUSTOMER'
        });
      }

      const redirectPath = localStorage.getItem('redirectAfterAuth') || '/';
      localStorage.removeItem('redirectAfterAuth');
      navigate(redirectPath);
    } catch (err) {
      console.error('Auth error:', err);
      const msg = err.response?.data?.error?.message || err.response?.data?.error || 'Authentication failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoCustomer = () => {
    setEmail('customer@cybercafe.com');
    setPassword('Customer@123');
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-8 max-w-lg mx-auto flex flex-col justify-center">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white mx-auto shadow-lg glow-indigo mb-3">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-black text-slate-100 tracking-tight">Cyber Cafe App</h1>
        <p className="text-xs text-slate-400 mt-1">
          Fast Govt Forms, Printouts & Verified Cafe Network
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-800/80 p-1 rounded-2xl border border-slate-700/60 mb-6">
        <button
          type="button"
          onClick={() => { setIsLogin(true); setError(null); }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => { setIsLogin(false); setError(null); }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            !isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Create Account
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-4 flex items-center gap-2 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Auth Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {!isLogin && (
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rohan Sharma"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700/70 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-slate-300 block mb-1">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@cybercafe.com"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700/70 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
        </div>

        {!isLogin && (
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Phone Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700/70 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-slate-300 block mb-1">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700/70 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xl active:scale-98 transition-all disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>{isLogin ? 'Sign In to Portal' : 'Register Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Quick Demo Helper */}
      {isLogin && (
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 mb-2">Want to test with a pre-configured account?</p>
          <button
            type="button"
            onClick={handleQuickDemoCustomer}
            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold py-1 px-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Fill Demo Credentials</span>
          </button>
        </div>
      )}
    </div>
  );
}
