import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Users, Star, CheckCircle } from 'lucide-react';
import ServiceCard from '../../components/customer/ServiceCard';
import { servicesApi } from '../../api/services';

import { services as fallbackServices } from '../../mockDataCustomer';

export default function Home() {
  const [services, setServices] = useState(fallbackServices);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/services?q=${encodeURIComponent(query.trim())}`);
    } else {
      navigate('/services');
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
        console.warn('Home page fallback services used:', err);
      });
  }, []);

  return (
    <div>
      <div className="hero-section">
        <h1>Your Online Cyber Cafe,<br/>Anytime.</h1>
        <p>Government forms, online applications, document services and more — get them done by verified cyber-cafe professionals.</p>
        
        <form onSubmit={handleSearch} className="search-bar-large">
          <input 
            type="text" 
            placeholder="What service do you need?" 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
          />
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginTop: '40px', color: 'var(--text-muted)' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={18} color="var(--brand-blue)"/> 500+ Services</div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={18} color="var(--brand-blue)"/> 10K+ Happy Customers</div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Star size={18} color="var(--brand-blue)"/> 4.8+ Average Rating</div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Shield size={18} color="var(--brand-blue)"/> 100% Secure & Safe</div>
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>Popular Services</h2>
        <Link to="/services" style={{ color: 'var(--brand-blue)', textDecoration: 'none', fontWeight: '500' }}>View All Services →</Link>
      </div>
      
      {loading && <div style={{ textAlign: 'center', padding: '40px' }}>Loading services...</div>}
      {error && (
        <div style={{ color: 'red', textAlign: 'center', padding: '40px' }}>
          <p>{error}</p>
          <button className="btn btn-outline" style={{ margin: '16px auto 0' }} onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
      {!loading && !error && services.length === 0 && <div style={{ textAlign: 'center', padding: '40px' }}>No services available right now.</div>}
      
      {!loading && !error && (
        <div className="service-grid">
          {services.slice(0, 6).map(s => <ServiceCard key={s.id} service={s} />)}
        </div>
      )}
    </div>
  );
}
