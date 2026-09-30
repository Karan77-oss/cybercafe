import { useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Upload, 
  ExternalLink,
  Clock
} from 'lucide-react';

export default function WorkerDocuments() {
  const [docs, setDocs] = useState([
    {
      id: 'doc-1',
      title: 'Aadhaar Identity Proof',
      type: 'Identity Verification',
      status: 'VERIFIED',
      verifiedAt: '12 Jan 2026',
      fileName: 'Aadhaar_Operator_Signed.pdf'
    },
    {
      id: 'doc-2',
      title: 'Cyber Cafe / CSC Registration Certificate',
      type: 'Business License',
      status: 'VERIFIED',
      verifiedAt: '15 Jan 2026',
      fileName: 'Shop_Est_License_Patna.pdf'
    },
    {
      id: 'doc-3',
      title: 'Cancelled Cheque / Bank Passbook Copy',
      type: 'Payout Verification',
      status: 'VERIFIED',
      verifiedAt: '15 Jan 2026',
      fileName: 'SBI_Passbook_Verified.pdf'
    }
  ]);

  const [uploadModal, setUploadModal] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('Renewal');

  const handleUpload = (e) => {
    e.preventDefault();
    if (!docTitle) return;
    setDocs(prev => [
      ...prev,
      {
        id: `doc-${Date.now()}`,
        title: docTitle,
        type: docType,
        status: 'PENDING_REVIEW',
        verifiedAt: 'Under Review',
        fileName: `${docTitle.replace(/\s+/g, '_')}.pdf`
      }
    ]);
    setDocTitle('');
    setUploadModal(false);
    alert('Document uploaded for administrative review.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
            Operator Accreditation Documents
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
            Section 3: Verified governmental and business credentials for your cyber cafe center.
          </p>
        </div>

        <button
          onClick={() => setUploadModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Upload size={16} /> Upload New Certificate
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {docs.map(doc => {
          const isVerified = doc.status === 'VERIFIED';
          return (
            <div
              key={doc.id}
              className="form-card"
              style={{
                padding: '22px',
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderLeft: `4px solid ${isVerified ? '#10b981' : '#f59e0b'}`
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                    {doc.type}
                  </span>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: isVerified ? '#ecfdf5' : '#fffbeb',
                    color: isVerified ? '#065f46' : '#b45309',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {isVerified ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                    {doc.status}
                  </span>
                </div>

                <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: '#1e293b' }}>
                  {doc.title}
                </h3>
                <div style={{ fontSize: '0.84rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} color="#3b82f6" /> {doc.fileName}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  {isVerified ? `Verified on ${doc.verifiedAt}` : 'Submitted for review'}
                </span>
                <button
                  onClick={() => alert(`Viewing ${doc.fileName} (Security watermark applied).`)}
                  className="btn btn-outline"
                  style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  View <ExternalLink size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {uploadModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '90%', maxWidth: '440px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', color: '#1e293b' }}>Upload Verification Document</h3>
            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Document Name / Purpose
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={e => setDocTitle(e.target.value)}
                  placeholder="e.g. GST Certificate / Renewed Trade License"
                  required
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Category
                </label>
                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', background: 'white' }}
                >
                  <option value="Renewal">License Renewal</option>
                  <option value="Tax Certificate">Tax / GST Registration</option>
                  <option value="Identity">Updated Identity Proof</option>
                  <option value="Other">Other Certificate</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setUploadModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Upload Document</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}