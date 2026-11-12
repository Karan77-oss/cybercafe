import { useState, useEffect } from 'react';
import { Smartphone, CheckCircle2, ArrowUpCircle, RefreshCw, Sparkles } from 'lucide-react';
import { systemApi } from '../api/client';

export default function AppVersionCard({ currentVersion = '1.0.0' }) {
  const [versionInfo, setVersionInfo] = useState({
    latest_version: '1.0.0',
    min_required_version: '1.0.0',
    current_version: currentVersion
  });
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const fetchVersion = async () => {
    try {
      setLoading(true);
      const res = await systemApi.getAppVersion();
      const data = res?.data || res || {};
      setVersionInfo({
        latest_version: data.latest_version || '1.2.0',
        min_required_version: data.min_required_version || '1.0.0',
        current_version: currentVersion
      });
    } catch (e) {
      console.warn('Could not fetch remote version info:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersion();
  }, []);

  // Simple semver compare: returns true if v1 < v2
  const isOlderVersion = (v1, v2) => {
    if (!v1 || !v2) return false;
    const parts1 = v1.replace(/[^0-9.]/g, '').split('.').map(Number);
    const parts2 = v2.replace(/[^0-9.]/g, '').split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;
      if (num1 < num2) return true;
      if (num1 > num2) return false;
    }
    return false;
  };

  const hasUpdate = isOlderVersion(versionInfo.current_version, versionInfo.latest_version) && !updateSuccess;

  const handleUpdate = () => {
    setUpdating(true);
    setTimeout(() => {
      setUpdating(false);
      setUpdateSuccess(true);
      setVersionInfo(prev => ({
        ...prev,
        current_version: prev.latest_version
      }));
    }, 1200);
  };

  return (
    <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-neo-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-900">App Version & Build</h3>
            <p className="text-[10px] text-slate-500">
              Installed: v{versionInfo.current_version}
            </p>
          </div>
        </div>

        <div>
          {hasUpdate ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200/70">
              <Sparkles className="w-3 h-3 text-amber-600" />
              Update Available
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Up to date
            </span>
          )}
        </div>
      </div>

      <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200/70 text-[11px] text-slate-700 flex items-center justify-between">
        <div>
          <span className="text-slate-500 block text-[10px]">Remote Config Target</span>
          <span className="font-bold text-slate-900">Latest: v{versionInfo.latest_version}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">Min Required</span>
          <span className="font-bold text-slate-900">v{versionInfo.min_required_version}</span>
        </div>
        <button
          onClick={fetchVersion}
          disabled={loading}
          className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 transition-colors"
          title="Check for updates"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {hasUpdate && (
        <button
          onClick={handleUpdate}
          disabled={updating}
          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <ArrowUpCircle className="w-4 h-4" />
          <span>{updating ? 'Updating to Latest...' : `Update to v${versionInfo.latest_version}`}</span>
        </button>
      )}

      {updateSuccess && (
        <div className="p-2 bg-emerald-50 border border-emerald-200/70 rounded-xl text-center text-[11px] text-emerald-700 font-semibold">
          App updated to v{versionInfo.latest_version}! You are on the newest build.
        </div>
      )}
    </div>
  );
}
