import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Loader2, Eye, AlertCircle } from 'lucide-react';

export default function WatermarkedDocumentViewer({ doc, order, worker, onClose }) {
  const [docUrl, setDocUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [watermarkText, setWatermarkText] = useState('');

  const workerId = worker?.workerId || worker?.id || 'WORKER';
  const orderId = order?.orderNumber || order?.id || 'ORDER';

  useEffect(() => {
    let isMounted = true;
    const fetchSignedUrl = async () => {
      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('cybercafe:token');
        const apiBase = import.meta.env.VITE_API_URL || '';
        
        // Fetch 300s temporary signed URL and server watermark metadata
        const res = await fetch(`${apiBase}/api/documents/${doc.id}/signed-url`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error?.message || errData?.message || 'Access to this customer document is restricted.');
        }

        const data = await res.json();
        if (isMounted) {
          const resolvedUrl = data.signedUrl || data.url || `${apiBase}/api/documents/${doc.id}/download?token=${encodeURIComponent(token || '')}`;
          setDocUrl(resolvedUrl);
          const wm = data.watermark?.text || `For Sarkari Portal Processing Only - Worker ID: ${workerId} - Order #${orderId}`;
          setWatermarkText(wm);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to view secure document.');
          setLoading(false);
        }
      }
    };

    if (doc?.id) {
      fetchSignedUrl();
    }

    return () => {
      isMounted = false;
    };
  }, [doc?.id, workerId, orderId]);

  // Disable context menu (right click) to deter casual saving
  const handleContextMenu = (e) => {
    e.preventDefault();
    return false;
  };

  const isPdf = (doc?.mimeType || '').includes('pdf') || (doc?.fileName || '').toLowerCase().endsWith('.pdf') || (docUrl || '').toLowerCase().includes('.pdf');

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onContextMenu={handleContextMenu}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '960px',
          height: '90vh',
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div 
          style={{
            padding: '14px 20px',
            background: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #1e293b'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={20} color="#f59e0b" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                {doc?.name || doc?.fileName || 'Customer Document'}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                Secure Watermarked Viewing • Session expires in 5 minutes
              </div>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Document Area with Watermark Overlay */}
        <div 
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'auto',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onContextMenu={handleContextMenu}
        >
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#64748b' }}>
              <Loader2 className="animate-spin" size={36} color="#3b82f6" />
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Generating secure watermarked preview...</span>
            </div>
          )}

          {error && (
            <div style={{ padding: '32px', textAlign: 'center', maxWidth: '440px' }}>
              <AlertCircle size={44} color="#ef4444" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ margin: '0 0 8px', color: '#0f172a' }}>Document Access Restricted</h4>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.86rem', lineHeight: 1.5 }}>
                {error}
              </p>
            </div>
          )}

          {!loading && !error && docUrl && (
            <div 
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              {isPdf ? (
                <iframe
                  src={`${docUrl}#toolbar=0&navpanes=0`}
                  title="Document Preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    pointerEvents: 'auto'
                  }}
                />
              ) : (
                <img
                  src={docUrl}
                  alt="Customer Document Preview"
                  draggable={false}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    userSelect: 'none',
                    pointerEvents: 'none'
                  }}
                />
              )}

              {/* Watermark Diagonal Pattern Overlay */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  pointerEvents: 'none',
                  zIndex: 20,
                  overflow: 'hidden',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gridAutoRows: '180px',
                  alignContent: 'center',
                  justifyItems: 'center',
                  opacity: 0.28,
                  userSelect: 'none'
                }}
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      transform: 'rotate(-25deg)',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      textAlign: 'center',
                      lineHeight: 1.4,
                      padding: '10px',
                      border: '1px dashed rgba(15, 23, 42, 0.4)',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.4)'
                    }}
                  >
                    <div>{watermarkText || `For Sarkari Portal Processing Only`}</div>
                    <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '2px' }}>
                      Worker ID: {workerId} • Order #{orderId}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info note */}
        <div
          style={{
            padding: '10px 20px',
            background: '#f1f5f9',
            borderTop: '1px solid #e2e8f0',
            fontSize: '0.78rem',
            color: '#475569',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>
            Protected by Sarkari Cyber Cafe Zero-Trust Document Vault. File saving & extraction monitored.
          </span>
          <span style={{ fontWeight: 600, color: '#059669' }}>
            Audited Worker Session
          </span>
        </div>
      </div>
    </div>
  );
}
