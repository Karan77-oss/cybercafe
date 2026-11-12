import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Sparkles, Clock, ArrowRight,
  FileText, ShieldCheck, Zap, Layers, RefreshCw, AlertCircle
} from 'lucide-react';
import useServices from '../hooks/useServices';
import BrandLogo from '../components/BrandLogo';

export default function Home() {
  const navigate = useNavigate();
  // Single top-level destructure — never call useServices() inside inline JSX.
  const { services, loading, error, isEmpty, refetch } = useServices();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

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
    <div className="px-4 sm:px-5 pt-4 pb-28 space-y-4">
      {/* Brand Header */}
      <div className="flex items-center justify-between pt-1">
        <BrandLogo size="md" variant="orange" />
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-slate-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search govt forms, admit cards, PAN, certificates..."
          className="w-full pl-10 pr-12 py-3 bg-white border border-slate-200/80 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-300 transition-all shadow-neo-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-2 flex items-center min-w-[44px] justify-center rounded-lg text-xs text-slate-500 hover:text-slate-700"
          >
            Clear
          </button>
        )}
      </div>

      {/* Scrollable Category Chips */}
      {categories.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Featured Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#E8771B] via-[#D0630E] to-slate-900 p-4 shadow-md shadow-orange-950/10">
        <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-bold text-white mb-2 border border-white/20">
            <Sparkles className="w-3 h-3 text-orange-200" />
            <span>Guaranteed Submission</span>
          </div>
          <h2 className="text-base font-extrabold text-white leading-snug mb-1 break-words">
            Govt Exam & Scheme Form Filing
          </h2>
          <p className="text-[11px] text-orange-50/90 mb-3.5 sm:max-w-[280px]">
            Trained operators resize your documents, handle payment gateways, and deliver verified submission slips.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              onClick={() => {
                if (services.length > 0) {
                  navigate(`/service/${services[0].id}`);
                }
              }}
              className="bg-white text-orange-700 font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-transform w-full sm:w-auto"
            >
              <span>Instant Apply</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center justify-center sm:justify-start gap-1 text-[10px] text-orange-100 font-medium">
              <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
              <span>15 min avg. turnaround</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-600" />
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
            Available Services ({filteredServices.length})
          </h3>
        </div>
        <button
          onClick={refetch}
          className="w-8 h-8 rounded-full bg-white border border-slate-100 shadow-neo-sm flex items-center justify-center text-slate-500 hover:text-sky-600 active:scale-95 transition-transform"
          title="Refresh Catalog"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="bg-white rounded-3xl p-4 border border-slate-100 shadow-neo-sm animate-pulse h-44 flex flex-col justify-between">
              <div className="w-8 h-8 rounded-xl bg-slate-100 mb-2" />
              <div className="space-y-2">
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100/80 rounded w-full" />
              </div>
              <div className="h-4 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Error View */}
      {error && !loading && (
        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-4 text-center">
          <AlertCircle className="w-6 h-6 text-rose-500 mx-auto mb-2" />
          <p className="text-xs text-rose-600 mb-3">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-1.5 bg-rose-100 text-rose-700 rounded-xl text-xs font-bold active:scale-95 transition-transform"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Responsive Service Grid */}
      {!loading && !error && filteredServices.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredServices.map((service) => {
            const price = service.pricePaise ? `₹${Math.round(service.pricePaise / 100)}` : 'Free';

            return (
              <div
                key={service.id}
                onClick={() => navigate(`/service/${service.id}`)}
                className="group relative bg-white rounded-3xl p-3.5 border border-slate-100 shadow-neo-card hover:border-sky-100 flex flex-col justify-between transition-all duration-200 cursor-pointer active:scale-[0.98]"
              >
                <div>
                  {/* Top Badge: Category & Icon */}
                  <div className="flex items-start justify-between gap-1 mb-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200/70 truncate max-w-[85px]">
                      {service.category || 'General'}
                    </span>
                  </div>

                  {/* Service Title */}
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-sky-700 transition-colors line-clamp-2 leading-snug mb-1">
                    {service.name}
                  </h4>

                  {/* Short Description */}
                  <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed mb-3">
                    {service.description || 'Fast processing with verified cyber cafe operators.'}
                  </p>
                </div>

                {/* Card Footer: Price & Time */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 uppercase tracking-tight">Fee</span>
                    <span className="text-xs font-extrabold text-sky-700">{price}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Clock className="w-3 h-3 text-slate-400" />
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
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-neo-card text-center">
          <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 mb-1">
            {isEmpty ? 'No services available yet' : 'No services found'}
          </h4>
          <p className="text-xs text-slate-500 mb-4">
            {isEmpty
              ? 'New government forms are added regularly. Check back soon.'
              : 'Try adjusting your search terms or filter.'}
          </p>
          {isEmpty ? (
            <button
              onClick={refetch}
              className="text-xs text-sky-600 font-bold"
            >
              Refresh Catalog
            </button>
          ) : (
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
              className="text-xs text-sky-600 font-bold"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
