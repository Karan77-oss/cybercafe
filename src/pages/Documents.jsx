import React from 'react';
import { FileText, Search, Download, FileDigit, Info } from 'lucide-react';

export default function Documents() {
  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1>Documents</h1>
          <p className="subtitle">Securely manage documents uploaded by customers and workers.</p>
        </div>
      </div>
      
      <div className="stats-grid compact">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Documents</span>
            <div className="stat-icon" style={{background: 'rgba(128, 90, 213, 0.1)', color: '#805ad5'}}><FileText size={20}/></div>
          </div>
          <h2 className="stat-value">0</h2>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Verified</span>
            <div className="stat-icon" style={{background: 'rgba(16, 185, 129, 0.1)', color: '#10b981'}}><FileDigit size={20}/></div>
          </div>
          <h2 className="stat-value">0</h2>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Pending Verification</span>
            <div className="stat-icon" style={{background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b'}}><Search size={20}/></div>
          </div>
          <h2 className="stat-value">0</h2>
        </div>
      </div>

      <div className="data-table-container">
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Info size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <h3>Document Verification System</h3>
          <p style={{ maxWidth: '400px', margin: '0 auto' }}>
            The centralized document management dashboard is under construction. 
            Currently, documents can be securely accessed directly from within individual Orders.
          </p>
        </div>
      </div>
    </div>
  );
}
