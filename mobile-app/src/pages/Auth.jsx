import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock, Mail, User, Phone, ArrowRight,
  ShieldCheck, AlertCircle, Loader2, Sparkles
} from 'lucide-react';
import { authApi } from '../api/client';
import BrandLogo from '../components/BrandLogo';

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
    <div className="px-5 pt-8 pb-24 min-h-screen flex flex-col justify-center">
      {/* Brand Header */}
      <div className="text-center mb-8 flex flex-col items-center">
        <BrandLogo size="hero" variant="orange" className="mb-2" />
        <p className="text-xs text-slate-500 max-w-[260px] mx-auto text-center font-medium mt-1">
          Fast Govt Forms, Online Applications & Verified Operator Network
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border border-slate-200/80 shadow-neo-sm p-1 rounded-2xl mb-5">
        <button
          type="button"
          onClick={() => { setIsLogin(true); setError(null); }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            isLogin ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => { setIsLogin(false); setError(null); }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            !isLogin ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Create Account
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 mb-4 flex items-center gap-2 text-xs text-rose-600">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Auth Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {!isLogin && (
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rohan Sharma"
                className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@cybercafe.com"
              className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
          </div>
        </div>

        {!isLogin && (
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 bg-slate-900 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all disabled:opacity-50"
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
        <div className="mt-6 pt-4 border-t border-slate-200/80 text-center">
          <p className="text-[11px] text-slate-500 mb-2">Want to test with a pre-configured account?</p>
          <button
            type="button"
            onClick={handleQuickDemoCustomer}
            className="inline-flex items-center gap-1.5 text-xs text-sky-700 hover:text-sky-800 font-bold py-1.5 px-3 rounded-full bg-sky-50 border border-sky-200/70 active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>Fill Demo Credentials</span>
          </button>
        </div>
      )}
    </div>
  );
}
