import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, Search, Sparkles, Clock, ArrowRight, 
  FileText, ShieldCheck, Zap, Layers, RefreshCw, AlertCircle
} from 'lucide-react';
import { servicesApi } from '../api/client';

export default function Home() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await servicesApi.getServices();
      if (data && data.services) {
        setServices(data.services.filter(s => s.status === 'ACTIVE' || !s.status));
      } else if (Array.isArray(data)) {
        setServices(data);
      }
    } catch (err) {
      console.error('Failed to load services:', err);
      setError('Unable to load services. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // Extract unique categories
  const categories = ['All', ...new Set(services.map(s => s.category).filter(Boolean))];

  // Filtered services
  const filteredServices = services.filter(service => {
    const matchesCategory = selectedCategory === 'All' || service.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (service.category && service.category.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen pb-24 px-4 pt-3 max-w-lg mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xs shadow-md">
            CC
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-100 tracking-tight leading-none">Cyber Cafe</h1>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Online Citizen & Digital Services</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/60 rounded-full px-2.5 py-1 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-300">Live Support</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-5">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-slate-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search govt forms, admit cards, PAN, certificates..."
          className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700/70 rounded-2xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-slate-400 hover:text-slate-200"
          >
            Clear
          </button>
        )}
      </div>

      {/* Dynamic Promotional Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-5 mb-6 shadow-xl border border-indigo-400/20">
        <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-cyan-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-400/10 rounded-full blur-xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold text-cyan-200 mb-2 border border-white/10">
            <Sparkles className="w-3 h-3 text-cyan-300" />
            <span>Guaranteed Submission</span>
          </div>

          <h2 className="text-lg font-black text-white leading-snug mb-1">
            Govt Exam & Scheme Form Filing
          </h2>
          <p className="text-xs text-indigo-100/90 mb-4 max-w-[280px]">
            Trained operators resize your documents, handle payment gateways, and deliver verified submission slips.
          </p>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (services.length > 0) {
                  navigate(`/service/${services[0].id}`);
                }
              }}
              className="bg-white text-indigo-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
            >
              <span>Instant Apply</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-1 text-[11px] text-indigo-200 font-medium">
              <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
              <span>15 min avg. turnaround</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      {categories.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm glow-cyan'
                  : 'bg-slate-800/70 text-slate-400 border border-slate-700/60 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Section Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
            Available Services ({filteredServices.length})
          </h3>
        </div>
        <button 
          onClick={fetchServices}
          className="text-slate-400 hover:text-cyan-400 transition-colors p-1"
          title="Refresh Catalog"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/40 animate-pulse h-44 flex flex-col justify-between">
              <div className="w-8 h-8 rounded-xl bg-slate-700/60 mb-2" />
              <div className="space-y-2">
                <div className="h-4 bg-slate-700/60 rounded w-3/4" />
                <div className="h-3 bg-slate-700/40 rounded w-full" />
              </div>
              <div className="h-4 bg-slate-700/50 rounded w-1/2 mt-3" />
            </div>
          ))}
        </div>
      )}

      {/* Error View */}
      {error && !loading && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-center my-4">
          <AlertCircle className="w-6 h-6 text-rose-400 mx-auto mb-2" />
          <p className="text-xs text-rose-200 mb-3">{error}</p>
          <button
            onClick={fetchServices}
            className="px-3.5 py-1.5 bg-rose-500/20 text-rose-300 rounded-xl text-xs font-semibold hover:bg-rose-500/30"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* 2-Column Mobile Cards */}
      {!loading && !error && filteredServices.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {filteredServices.map((service) => {
            const price = service.pricePaise ? `₹${Math.round(service.pricePaise / 100)}` : 'Free';

            return (
              <div
                key={service.id}
                onClick={() => navigate(`/service/${service.id}`)}
                className="group relative bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-cyan-500/40 rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200 shadow-md cursor-pointer active:scale-[0.98]"
              >
                <div>
                  {/* Top Badge: Category & Icon */}
                  <div className="flex items-start justify-between gap-1 mb-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded-md border border-slate-700/50 truncate max-w-[85px]">
                      {service.category || 'General'}
                    </span>
                  </div>

                  {/* Service Title */}
                  <h4 className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug mb-1">
                    {service.name}
                  </h4>

                  {/* Short Description */}
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
                    {service.description || 'Fast processing with verified cyber cafe operators.'}
                  </p>
                </div>

                {/* Card Footer: Price & Time */}
                <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 uppercase tracking-tight">Fee</span>
                    <span className="text-xs font-extrabold text-cyan-400">{price}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span className="truncate max-w-[55px]">{service.estimatedTime || 'Fast'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredServices.length === 0 && (
        <div className="text-center py-12 px-4 glass-card rounded-2xl">
          <FileText className="w-10 h-10 text-slate-500 mx-auto mb-2 opacity-50" />
          <h4 className="text-sm font-bold text-slate-200 mb-1">No services found</h4>
          <p className="text-xs text-slate-400 mb-3">Try adjusting your search terms or filter.</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
            className="text-xs text-cyan-400 font-semibold"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
