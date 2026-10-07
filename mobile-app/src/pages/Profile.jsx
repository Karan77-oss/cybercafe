import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, ShieldCheck, HeartHandshake, FileText, 
  LogOut, ChevronRight, Phone, Mail, HelpCircle, 
  ExternalLink, LogIn 
} from 'lucide-react';
import { authApi } from '../api/client';
import AppVersionCard from '../components/AppVersionCard';

export default function Profile() {
  const navigate = useNavigate();
  const user = authApi.getCurrentUser();
  const isAuthenticated = authApi.isAuthenticated();

  const handleLogout = () => {
    authApi.logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-3 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="mb-5">
        <h1 className="text-sm font-extrabold text-slate-100">My Profile</h1>
        <p className="text-[10px] text-slate-400 font-medium">Manage your account & credentials</p>
      </div>

      {/* User Info Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-850 to-slate-900 border border-slate-700/80 p-5 mb-5 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-extrabold text-xl shadow-lg glow-indigo">
            {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-7 h-7" />}
          </div>
          <div className="overflow-hidden">
            <h2 className="text-base font-extrabold text-slate-100 truncate">
              {user?.name || (isAuthenticated ? 'Customer Account' : 'Guest Visitor')}
            </h2>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate mt-0.5">
              <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">{user?.email || 'Not signed in'}</span>
            </p>
            {user?.phone && (
              <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate mt-0.5">
                <Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>{user.phone}</span>
              </p>
            )}
          </div>
        </div>

        {isAuthenticated && (
          <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs">
            <span className="text-slate-400">Account Status</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Customer</span>
            </span>
          </div>
        )}
      </div>

      {/* Quick Navigation Items */}
      <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-2 mb-5 space-y-1">
        <button
          onClick={() => navigate('/orders')}
          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-700/50 text-slate-200 transition-all text-xs font-semibold"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <span>My Application Orders</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        <button
          onClick={() => navigate('/customer-welfare')}
          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-700/50 text-slate-200 transition-all text-xs font-semibold"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <span>Customer Welfare & Complaints</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        <a
          href="tel:1800123456"
          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-700/50 text-slate-200 transition-all text-xs font-semibold"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
            <span>Cyber Cafe Helpline (24x7)</span>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-500" />
        </a>
      </div>

      {/* App Version Card */}
      <div className="mb-5">
        <AppVersionCard currentVersion="1.0.0" />
      </div>

      {/* Auth Action */}
      {isAuthenticated ? (
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-98"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Mobile App</span>
        </button>
      ) : (
        <button
          onClick={() => navigate('/auth')}
          className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all"
        >
          <LogIn className="w-4 h-4" />
          <span>Sign In or Register</span>
        </button>
      )}
    </div>
  );
}
