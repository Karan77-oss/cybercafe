import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import ServiceCard from '../../components/customer/ServiceCard';
import { servicesApi } from '../../api/services';

import { services as fallbackServices } from '../../mockDataCustomer';

export default function ServicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState(fallbackServices);
  const [loading, setLoading] = useState(false);
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
    servicesApi.getServices()
      .then((res) => {
        if (res.services && res.services.length > 0) {
          setServices(res.services);
        }
      })
      .catch((err) => {
        console.warn('Using fallback services catalog:', err);
      });
  }, []);
  
  const categories = [
    { id: 'all', name: 'All Services' },
    { id: 'Online form filling', name: 'Online Form Filling' },
    { id: 'Government forms', name: 'Government Forms' },
    { id: 'Job applications', name: 'Job Applications' },
    { id: 'College/university admission forms', name: 'College Admission' },
    { id: 'Scholarship forms', name: 'Scholarships' },
    { id: 'PAN-related services', name: 'PAN Services' },
    { id: 'Passport-related application assistance', name: 'Passport Assistance' },
    { id: 'Railway/flight/bus booking', name: 'Ticket Booking' },
    { id: 'Document scanning', name: 'Scanning' },
    { id: 'PDF creation/editing', name: 'PDF Editing' },
    { id: 'Printout services', name: 'Printouts' },
    { id: 'Resume/CV making', name: 'Resume / CV' },
    { id: 'Photo/signature resizing', name: 'Photo Resizing' },
    { id: 'Online payment/recharge', name: 'Online Payment' },
    { id: 'Certificate applications', name: 'Certificates' },
    { id: 'Income/caste/residence certificate assistance', name: 'Caste / Income / Domicile' }
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
