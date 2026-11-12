import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, FileText, HeartHandshake, User } from 'lucide-react';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Orders', path: '/orders', icon: FileText },
    { label: 'Welfare', path: '/customer-welfare', icon: HeartHandshake },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200">
      <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto px-4 pt-2 pb-safe flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center min-h-[44px] px-4 rounded-2xl transition-all duration-200 relative ${
                isActive ? 'text-sky-600' : 'text-slate-400 active:text-slate-500'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                {isActive && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-sky-600 glow-sky" />
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight font-semibold ${isActive ? 'text-sky-700' : 'text-slate-500'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
