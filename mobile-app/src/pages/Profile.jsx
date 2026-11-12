import { useNavigate } from 'react-router-dom';
import {
  User, ShieldCheck, HeartHandshake,
  LogOut, ChevronRight, Phone, Mail, HelpCircle,
  ExternalLink, LogIn, FileCheck2
} from 'lucide-react';
import { authApi } from '../api/client';
import BrandLogo from '../components/BrandLogo';

export default function Profile() {
  const navigate = useNavigate();
  const user = authApi.getCurrentUser();
  const isAuthenticated = authApi.isAuthenticated();

  const handleLogout = () => {
    authApi.logout();
    navigate('/auth');
  };

  return (
    <div className="px-5 pt-4 pb-28 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-extrabold text-slate-900 tracking-tight">My Profile</h1>
          <p className="text-[11px] text-slate-500 font-medium">Manage your account & credentials</p>
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-neo-card flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-extrabold text-base flex items-center justify-center shadow-md shrink-0">
          {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold text-slate-900 truncate">
              {user?.name || (isAuthenticated ? 'Customer Account' : 'Guest Visitor')}
            </h2>
            {isAuthenticated && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.5 rounded-full shrink-0">
                <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" /> Verified
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate flex items-center gap-1.5">
            <Mail className="w-3 h-3 text-sky-600 shrink-0" />
            <span className="truncate">{user?.email || 'Not signed in'}</span>
          </p>
          {user?.phone && (
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate mt-0.5">
              <Phone className="w-3 h-3 text-sky-600 shrink-0" />
              <span className="truncate">{user.phone}</span>
            </p>
          )}
        </div>
      </div>

      {/* Quick Navigation Items */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Utilities & Storage</span>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-neo-card divide-y divide-slate-100 overflow-hidden">
          <button
            onClick={() => navigate('/orders')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800">My Application Orders</p>
                <p className="text-[10px] text-slate-500">Track filing progress & receipts</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          <button
            onClick={() => navigate('/customer-welfare')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800">Customer Welfare & Complaints</p>
                <p className="text-[10px] text-slate-500">Disputes & refund tracking</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          <a
            href="tel:1800123456"
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800">Cyber Cafe Helpline (24x7)</p>
                <p className="text-[10px] text-slate-500">Speak with a support agent</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
          </a>
        </div>
      </div>

      {/* Auth Action */}
      {isAuthenticated ? (
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-2xl bg-white border border-rose-200 text-rose-600 text-xs font-bold flex items-center justify-center gap-2 shadow-neo-sm hover:bg-rose-50/50 active:scale-[0.98] transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Mobile App</span>
        </button>
      ) : (
        <button
          onClick={() => navigate('/auth')}
          className="w-full py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all"
        >
          <LogIn className="w-4 h-4" />
          <span>Sign In or Register</span>
        </button>
      )}

      {/* Brand Footer */}
      <div className="flex flex-col items-center justify-center pt-4 pb-2 opacity-80">
        <BrandLogo size="sm" variant="orange" />
        <p className="text-[10px] text-slate-400 mt-1 font-medium">Enterprise Cyber Cafe Digital Marketplace</p>
      </div>
    </div>
  );
}
