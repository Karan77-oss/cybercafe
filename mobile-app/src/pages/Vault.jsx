import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderLock, ShieldCheck, Download, Upload, Camera,
  Search, FileText, RefreshCw, AlertCircle, Loader2
} from 'lucide-react';
import { vaultApi, authApi } from '../api/client';
import { takePhoto } from '../utils/camera';

export default function Vault() {
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  const isAuthenticated = authApi.isAuthenticated();

  const fetchVaultDocs = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await vaultApi.getDocuments();
      const docs = res?.documents || res?.data?.documents || (Array.isArray(res) ? res : []);
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load vault documents:', err);
      setError('Unable to fetch stored documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaultDocs();
  }, [isAuthenticated]);

  const handleUploadFile = async (file, docType = 'Personal Document') => {
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docName', docType);

      await vaultApi.uploadDocument(formData);
      await fetchVaultDocs();
    } catch (err) {
      console.error('Vault upload failed:', err);
      setError('Failed to upload document to vault.');
    } finally {
      setUploading(false);
    }
  };

  const handleCameraScan = async () => {
    const result = await takePhoto('Vault_Scan');
    if (result && result.file) {
      handleUploadFile(result.file, 'Camera Scanned Document');
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const name = doc.name || doc.fileName || doc.docName || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (!isAuthenticated) {
    return (
      <div className="px-5 pt-12 pb-6 min-h-screen flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-3xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mb-4">
          <FolderLock className="w-8 h-8" />
        </div>
        <h2 className="text-base font-extrabold text-slate-900 mb-2">Digital Document Vault</h2>
        <p className="text-xs text-slate-500 max-w-xs mb-6">
          Securely store your Aadhaar, PAN card, marksheets, and passport photos for 1-click form filing across cyber cafes.
        </p>
        <button
          onClick={() => {
            localStorage.setItem('redirectAfterAuth', '/vault');
            navigate('/auth');
          }}
          className="px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl text-xs shadow-md active:scale-95 transition-transform"
        >
          Sign In to Access Vault
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 pt-4 pb-28 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
            <FolderLock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-extrabold text-slate-900">Customer Vault</h1>
            <p className="text-[10px] text-sky-700 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-sky-600" />
              <span>Encrypted Storage Active</span>
            </p>
          </div>
        </div>

        <button
          onClick={fetchVaultDocs}
          className="w-8 h-8 rounded-full bg-white shadow-neo-sm border border-slate-100 flex items-center justify-center text-slate-500 hover:text-sky-600 active:scale-95 transition-transform shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Quick Upload Action Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-neo-card">
        <span className="text-[11px] font-bold text-slate-800 block mb-2">Save New Document to Vault</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={handleCameraScan}
            className="flex items-center justify-center gap-2 py-2.5 px-3 bg-sky-50 hover:bg-sky-100/70 border border-sky-200/70 rounded-xl text-xs font-bold text-sky-800 transition-all active:scale-95 disabled:opacity-50"
          >
            <Camera className="w-4 h-4 text-sky-600" />
            <span>Scan with Camera</span>
          </button>

          <label className="flex items-center justify-center gap-2 py-2.5 px-3 bg-[#F8FAFC] hover:bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 cursor-pointer transition-all active:scale-95">
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Upload File</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleUploadFile(e.target.files[0], 'Uploaded Document')}
            />
          </label>
        </div>

        {uploading && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-sky-700">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Encrypting & Storing in Vault...</span>
          </div>
        )}
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
          placeholder="Search stored documents by name..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 shadow-neo-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
      </div>

      {/* Error View */}
      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 flex items-center gap-2 text-xs text-rose-600">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-2.5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-neo-sm animate-pulse h-16" />
          ))}
        </div>
      )}

      {/* Stored Documents List */}
      {!loading && filteredDocs.length > 0 && (
        <div className="space-y-2.5">
          {filteredDocs.map((doc) => {
            const fileName = doc.name || doc.fileName || doc.docName || 'Vault Document';
            const downloadUrl = doc.url || `/api/documents/${doc.id}/download`;

            return (
              <div
                key={doc.id}
                className="bg-white hover:border-sky-100 border border-slate-100 rounded-3xl p-3.5 shadow-neo-card flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3 overflow-hidden min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 truncate">{fileName}</h4>
                    <span className="text-[10px] text-slate-500 block">
                      {doc.size ? `${(doc.size / 1024).toFixed(1)} KB • ` : ''}Verified Document
                    </span>
                  </div>
                </div>

                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="p-2 rounded-xl bg-slate-50 hover:bg-sky-50 text-slate-500 hover:text-sky-700 border border-slate-200/70 transition-all shrink-0 ml-2"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty Vault State */}
      {!loading && filteredDocs.length === 0 && !error && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-neo-card text-center mt-2">
          <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center mx-auto mb-3">
            <FolderLock className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 mb-1">Your Vault is Empty</h4>
          <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto">
            Scan or upload your essential documents once. Whenever you file a form, they attach automatically!
          </p>
        </div>
      )}
    </div>
  );
}
