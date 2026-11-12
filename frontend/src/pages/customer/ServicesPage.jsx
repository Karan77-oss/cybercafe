import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import ServiceCard from '../../components/customer/ServiceCard';
import { servicesApi } from '../../api/services';

export default function ServicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Live catalog only — the Admin Portal's official service catalog is the
  // single source of truth. No hardcoded/mock fallback arrays.
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState(() => searchParams.get('q') || '');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) {
      setSearch(q);
    }
  }, [searchParams]);

  const handleSearchChange = (val) => {
    setSearch(val);
    if (val) {
      setSearchParams({ q: val }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  useEffect(() => {
    setLoading(true);
    // The /services endpoint returns only ACTIVE + APPROVED services, so this
    // list mirrors the Admin Portal catalog exactly. An empty response means an
    // empty catalog — render it as such, never fall back to hardcoded data.
    servicesApi.getServices()
      .then((res) => {
        setServices(Array.isArray(res?.services) ? res.services : []);
      })
      .catch((err) => {
        console.warn('Service catalog fetch failed:', err);
        setServices([]);
        setError('Unable to load services right now. Please retry.');
      })
      .finally(() => setLoading(false));
  }, []);
  
  // Categories are derived from the LIVE catalog, so any category an admin
  // adds/renames in /admin/services shows up here automatically.
  const categories = [
    { id: 'all', name: 'All Services' },
    ...Array.from(new Set(services.map(s => s.category).filter(Boolean)))
      .map((c) => ({ id: c, name: c }))
  ];

  const filtered = services.filter(s => {
    const sCat = (s.category || '').toLowerCase();
    const matchCat = activeCat === 'all' || sCat === activeCat.toLowerCase() || sCat.includes(activeCat.toLowerCase());
    const nameStr = (s.name || s.title || '') + ' ' + (s.description || '');
    const matchSearch = nameStr.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading services...</div>;
  if (error) return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>
      <p>{error}</p>
      <button className="btn btn-outline" style={{ margin: '16px auto 0' }} onClick={() => window.location.reload()}>Retry</button>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ marginBottom: '8px' }}>All Services</h1>
          <p className="text-muted">Choose a service to get started</p>
        </div>
        <div className="search-box" style={{ background: 'white' }}>
          <Search size={18} />
          <input type="text" placeholder="Search services..." value={search} onChange={e => handleSearchChange(e.target.value)} />
        </div>
      </div>
      
      <div className="category-tabs">
        {categories.map(c => (
          <button 
            key={c.id} 
            className={`category-tab ${activeCat === c.id ? 'active' : ''}`}
            onClick={() => setActiveCat(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>
      
      {filtered.length > 0 ? (
        <div className="service-grid">
          {filtered.map(s => <ServiceCard key={s.id} service={s} />)}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px' }}>
           <h3>No services found</h3>
           <p className="text-muted">Try adjusting your filters or search term.</p>
           <button className="btn btn-outline" style={{ margin: '16px auto 0' }} onClick={() => { handleSearchChange(''); setActiveCat('all'); }}>Clear Filters</button>
        </div>
      )}
    </div>
  );
}
