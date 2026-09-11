import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, User, LogOut, Box, FileText, ChevronRight, Bell, Wallet } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { servicesApi } from '../../api/services';
import { services as fallbackServices } from '../../mockDataCustomer';

export default function Header() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [servicesList, setServicesList] = useState(fallbackServices);
  
  const { user, logout } = useAuth();

  const searchRef = useRef();
  const dropdownRef = useRef();
  const navigate = useNavigate();

  // Load real services catalog for search
  useEffect(() => {
    servicesApi.getServices()
      .then(res => {
        if (res.services && res.services.length > 0) {
          setServicesList(res.services);
        }
      })
      .catch(() => {});
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const searchResults = searchQuery.trim().length > 1 
    ? servicesList.filter(item => 
        (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 6)
    : [];

  return (
    <header className="customer-header">
      <Link to="/" className="brand" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'var(--brand-blue)' }}>
        <Box size={28} />
        <div>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Cyber Cafe</h2>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Your Online Service Partner</p>
        </div>
      </Link>
      
      <nav className="customer-nav">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/services">Services</NavLink>
        <NavLink to="/orders">My Orders</NavLink>
        <NavLink to="/how-it-works">How It Works</NavLink>
        <NavLink to="/help">Help</NavLink>
      </nav>
      
      <div className="customer-actions">
        {/* Search */}
        <div ref={searchRef} style={{ position: 'relative' }}>
          <button className="icon-btn" onClick={() => setShowSearch(!showSearch)}><Search size={20}/></button>
          {showSearch && (
            <div style={{ position: 'absolute', top: '40px', right: 0, width: '360px', background: 'white', borderRadius: '12px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)', padding: '16px', zIndex: 1000 }}>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchQuery.trim()) {
                    setShowSearch(false);
                    navigate(`/services?q=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }}
                style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--brand-blue)', borderRadius: '8px', padding: '8px 12px' }}
              >
                <Search size={16} color="var(--text-muted)" style={{ marginRight: '8px' }}/>
                <input 
                  autoFocus 
                  type="text" 
                  placeholder="Search services..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem' }} 
                />
              </form>
              <div style={{ marginTop: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                {searchQuery.trim() && searchResults.length === 0 && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>No matching services found.</p>
                )}
                {searchResults.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => { 
                      setShowSearch(false); 
                      setSearchQuery('');
                      navigate(`/services/${item.id}`); 
                    }} 
                    style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} 
                    className="search-result-item"
                  >
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {item.category} • ₹{(item.pricePaise / 100).toFixed(2)}
                      </div>
                    </div>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </div>
                ))}
                {searchQuery.trim() && (
                  <div 
                    onClick={() => { 
                      setShowSearch(false); 
                      navigate(`/services?q=${encodeURIComponent(searchQuery.trim())}`); 
                    }}
                    style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--brand-blue)', cursor: 'pointer', fontWeight: 500 }}
                  >
                    View all matching services →
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Icon (logged in customer) */}
        {user && (
          <button className="icon-btn" onClick={() => navigate('/notifications')} title="Notifications">
            <Bell size={20} />
          </button>
        )}

        {/* User Dropdown */}
        {user ? (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setShowDropdown(!showDropdown)}>
               <User size={16}/> {(user.name || 'Customer').split(' ')[0]}
            </button>
            
            {showDropdown && (
              <div style={{ position: 'absolute', top: '50px', right: 0, width: '240px', background: 'white', borderRadius: '12px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)', zIndex: 1000, overflow: 'hidden' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
                  <div style={{ fontWeight: 600 }}>{user.name || 'Customer'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--brand-blue)', marginTop: '4px', fontWeight: 600 }}>{user.role}</div>
                </div>
                <div style={{ padding: '8px 0' }}>
                  <Link to="/profile" className="dropdown-item" onClick={() => setShowDropdown(false)}><User size={16}/> My Profile</Link>
                  <Link to="/orders" className="dropdown-item" onClick={() => setShowDropdown(false)}><Box size={16}/> My Orders</Link>
                  <Link to="/wallet" className="dropdown-item" onClick={() => setShowDropdown(false)}><Wallet size={16}/> Platform Wallet</Link>
                  <Link to="/notifications" className="dropdown-item" onClick={() => setShowDropdown(false)}><Bell size={16}/> Notifications</Link>
                  <Link to="/documents" className="dropdown-item" onClick={() => setShowDropdown(false)}><FileText size={16}/> Documents</Link>
                </div>
                <div style={{ padding: '8px 0', borderTop: '1px solid var(--border-color)' }}>
                  <button className="dropdown-item" style={{ width: '100%', textAlign: 'left', color: 'var(--red)', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => { 
                    setShowDropdown(false); 
                    logout();
                    navigate('/'); 
                  }}>
                    <LogOut size={16}/> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-outline" onClick={() => navigate('/login')}>Login</button>
            <button className="btn btn-primary" onClick={() => navigate('/register')}>Register</button>
          </div>
        )}
      </div>
    </header>
  );
}
