"use client";

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { importSocialPostsAction } from '../app/actions/importSocialPosts';

export default function SyncFeedButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSync = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await importSocialPostsAction();
      setResult(res);
      if (res.success) {
        // Reload to display updated server-side static content (ISR refreshed)
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      setResult({ success: false, error: 'Failed to sync feed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '12px', marginBottom: '24px' }}>
      <button
        onClick={handleSync}
        disabled={loading}
        className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white font-extrabold text-xs py-3 px-6 rounded-xl transition-all duration-150 shadow-md disabled:bg-gray-400"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: loading ? '#94a3b8' : '#0f172a',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '0.85rem',
          padding: '10px 18px',
          borderRadius: '10px',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 150ms ease',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        {loading ? 'Syncing Feed...' : 'Sync Social Feed'}
      </button>

      {result && (
        <span 
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: result.success ? '#16a34a' : '#dc2626'
          }}
        >
          {result.success 
            ? `Sync completed: ${result.inserted} added, ${result.updated} updated.`
            : `Sync failed: ${result.errors?.[0]?.message || 'Server error'}`
          }
        </span>
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
