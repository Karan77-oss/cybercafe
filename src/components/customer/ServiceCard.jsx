import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';

export default function ServiceCard({ service }) {
  const IconComponent = Icons[service.icon] || Icons.FileText;
  
  return (
    <Link to={`/services/${service.id}`} className="service-card">
      <div className="service-card-header">
        <div className="service-icon">
          <IconComponent size={24} />
        </div>
        <div>
          <h3>{service.name || service.title}</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{service.category}</p>
        </div>
      </div>
      <p>{service.description}</p>
      <div className="service-card-footer" style={{ alignItems: 'flex-end' }}>
        <div>
           <div style={{ color: 'var(--brand-blue)', fontWeight: 600 }}>₹{service.pricePaise ? (service.pricePaise / 100).toFixed(2) : service.price} onwards</div>
           <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{service.estimatedTime}</div>
        </div>
        <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>Apply Now</button>
      </div>
    </Link>
  );
}
