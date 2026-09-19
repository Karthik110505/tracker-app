import React, { useState } from 'react';
import { X, Server, CheckCircle2, AlertCircle, RefreshCw, Wifi, Globe, Database } from 'lucide-react';
import { motion } from 'framer-motion';
import { getApiBaseUrl, setApiBaseUrl } from '../../api/client';

export default function MobileSettingsModal({ onClose, onSyncTrigger }) {
  const [apiUrl, setApiUrlState] = useState(getApiBaseUrl());
  const [testStatus, setTestStatus] = useState(null); // { type: 'success' | 'error' | 'testing', message, latency }
  const [saving, setSaving] = useState(false);

  const handleTestConnection = async (urlToTest = apiUrl) => {
    setTestStatus({ type: 'testing', message: 'Testing connection to backend API...' });
    const startTime = performance.now();
    try {
      const cleanUrl = urlToTest.replace(/\/$/, '');
      const healthUrl = `${cleanUrl}/health`;
      const res = await fetch(healthUrl, { cache: 'no-store' });
      const latency = Math.round(performance.now() - startTime);

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setTestStatus({
          type: 'success',
          message: `Connected successfully! Database: ${data.database || 'Active'}`,
          latency
        });
      } else {
        setTestStatus({
          type: 'error',
          message: `Server reached but responded with HTTP ${res.status}.`
        });
      }
    } catch (err) {
      setTestStatus({
        type: 'error',
        message: `Could not reach server: ${err.message}. Ensure backend is running and URL is correct.`
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setApiBaseUrl(apiUrl);
    if (onSyncTrigger) {
      await onSyncTrigger();
    }
    setSaving(false);
    onClose();
  };

  const handlePreset = (presetUrl) => {
    setApiUrlState(presetUrl);
    handleTestConnection(presetUrl);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0'
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          backgroundColor: '#0f172a',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          padding: '24px 20px 36px 20px',
          overflowY: 'auto',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.6)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle pill */}
        <div style={{
          width: '40px',
          height: '4px',
          borderRadius: '2px',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          margin: '0 auto 16px auto'
        }} />

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8'
            }}>
              <Server size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                Cloud Connection Settings
              </h3>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Configure mobile backend endpoint
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* URL Input */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
            Backend API URL (with /api)
          </label>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrlState(e.target.value)}
            placeholder="https://your-api.onrender.com/api"
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              color: '#f8fafc',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Quick Presets */}
        <div style={{ marginBottom: '20px' }}>
          <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Quick Presets
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handlePreset('https://gate-tracker-api.onrender.com/api')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.2)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                color: '#a5b4fc',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Globe size={13} />
              <span>Render Cloud</span>
            </button>
            <button
              type="button"
              onClick={() => handlePreset('/api')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Server size={13} />
              <span>Desktop Web</span>
            </button>
            <button
              type="button"
              onClick={() => handlePreset('http://10.0.2.2:5000/api')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Wifi size={13} />
              <span>Android Emulator</span>
            </button>
          </div>
        </div>

        {/* Test Connection Button */}
        <div style={{ marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => handleTestConnection(apiUrl)}
            disabled={testStatus?.type === 'testing'}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '12px',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#a5b4fc',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {testStatus?.type === 'testing' ? (
              <>
                <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Testing ping...</span>
              </>
            ) : (
              <>
                <Wifi size={15} />
                <span>Test Connection</span>
              </>
            )}
          </button>

          {/* Test Status Feedback */}
          {testStatus && (
            <div style={{
              marginTop: '10px',
              padding: '10px 12px',
              borderRadius: '10px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              background: testStatus.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : testStatus.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${testStatus.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : testStatus.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
              color: testStatus.type === 'success' ? '#34d399' : testStatus.type === 'error' ? '#f87171' : '#cbd5e1'
            }}>
              {testStatus.type === 'success' ? (
                <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : testStatus.type === 'error' ? (
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : null}
              <div>
                <span>{testStatus.message}</span>
                {testStatus.latency !== undefined && (
                  <span style={{ display: 'block', fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>
                    Response latency: {testStatus.latency}ms
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '13px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#94a3b8',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 2,
              padding: '13px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.35)'
            }}
          >
            {saving ? 'Saving...' : 'Save & Sync Now'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
