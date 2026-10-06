import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderLock, ShieldCheck, Download, Upload, Camera, 
  Search, FileText, RefreshCw, AlertCircle, Loader2, Sparkles 
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
      <div className="min-h-screen pb-24 px-4 pt-12 max-w-lg mx-auto text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
          <FolderLock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-100 mb-2">Digital Document Vault</h2>
        <p className="text-xs text-slate-400 max-w-xs mb-6">
          Securely store your Aadhaar, PAN card, marksheets, and passport photos for 1-click form filing across cyber cafes.
        </p>
        <button
          onClick={() => {
            localStorage.setItem('redirectAfterAuth', '/vault');
            navigate('/auth');
          }}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold rounded-xl text-xs shadow-lg active:scale-95 transition-all"
        >
          Sign In to Access Vault
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-3 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <FolderLock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-100">Customer Vault</h1>
            <p className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
              <span>Encrypted Storage Active</span>
            </p>
          </div>
        </div>

        <button
          onClick={fetchVaultDocs}
          className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Quick Upload Action Bar */}
      <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 mb-5">
        <span className="text-[11px] font-bold text-slate-300 block mb-2">Save New Document to Vault</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={handleCameraScan}
            className="flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-600/25 hover:bg-indigo-600/35 border border-indigo-500/40 rounded-xl text-xs font-semibold text-indigo-300 transition-all active:scale-95 disabled:opacity-50"
          >
            <Camera className="w-4 h-4 text-indigo-400" />
            <span>Scan with Camera</span>
          </button>

          <label className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-700/60 hover:bg-slate-700/80 border border-slate-600/60 rounded-xl text-xs font-semibold text-slate-200 cursor-pointer transition-all active:scale-95">
            <Upload className="w-4 h-4 text-cyan-400" />
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
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-cyan-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Encrypting & Storing in Vault...</span>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-slate-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search stored documents by name..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/70 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        />
      </div>

      {/* Error View */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-4 flex items-center gap-2 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-2.5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-slate-800/50 rounded-2xl p-3.5 border border-slate-700/40 animate-pulse h-16" />
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
                className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-slate-200 truncate">{fileName}</h4>
                    <span className="text-[10px] text-slate-400 block">
                      {doc.size ? `${(doc.size / 1024).toFixed(1)} KB • ` : ''}Verified Document
                    </span>
                  </div>
                </div>

                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="p-2 rounded-xl bg-slate-700/60 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-slate-600/50 transition-all shrink-0 ml-2"
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
      {!loading && filteredDocs.length === 0 && (
        <div className="text-center py-12 px-4 glass-card rounded-3xl mt-4">
          <FolderLock className="w-10 h-10 text-slate-500 mx-auto mb-2 opacity-50" />
          <h4 className="text-sm font-bold text-slate-200 mb-1">Your Vault is Empty</h4>
          <p className="text-xs text-slate-400 mb-4 max-w-xs mx-auto">
            Scan or upload your essential documents once. Whenever you file a form, they attach automatically!
          </p>
        </div>
      )}
    </div>
  );
}
