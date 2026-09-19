import React, { useState } from 'react';
import { Lock, AlertCircle, KeyRound, Loader2, Settings, Wifi, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../api/client';
import MobileSettingsModal from './MobileSettingsModal';

export default function MobileLogin({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError(false);

    try {
      // 1. Attempt cloud authentication against Express API
      const res = await apiClient.login(password, 'karthik');
      if (res && res.success) {
        localStorage.setItem('gate_tracker_auth', 'true');
        onLogin();
        return;
      }
    } catch (apiErr) {
      console.warn('Cloud login attempt failed (server offline or unreachable):', apiErr.message);
    } finally {
      setLoading(false);
    }

    // 2. Offline fallback: allow local password match so offline preparation is never blocked
    if (password === 'Karthik@1155') {
      localStorage.setItem('gate_tracker_auth', 'true');
      onLogin();
      return;
    }

    setError(true);
    setPassword('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#070913',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '24px 20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background ambient glow */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '320px',
        height: '320px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Top Header: Settings Trigger */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#818cf8',
            boxShadow: '0 0 10px #818cf8'
          }} />
          <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', color: '#94a3b8' }}>
            GATE 2027 COMPANION
          </span>
        </div>

        <button
          onClick={() => setShowSettings(true)}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#cbd5e1',
            cursor: 'pointer'
          }}
          title="Cloud Server Settings"
        >
          <Settings size={17} />
        </button>
      </header>

      {/* Main Login Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '380px',
          margin: '0 auto',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(16px)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '32px 24px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            color: '#818cf8',
            boxShadow: '0 0 24px rgba(99, 102, 241, 0.3)'
          }}>
            <Lock size={28} />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px 0', color: '#ffffff' }}>
            Portal Access
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
            Enter your passcode to sync tests & revision metrics
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '12px',
            marginBottom: '16px'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>Incorrect password. Please try again.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none'
            }}>
              <KeyRound size={18} />
            </div>
            <input
              type="password"
              placeholder="Enter Passcode"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(false);
              }}
              style={{
                width: '100%',
                padding: '14px 14px 14px 44px',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                backgroundColor: 'rgba(30, 41, 59, 0.6)',
                color: '#ffffff',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              autoFocus
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)'
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Connecting to Cloud...</span>
              </>
            ) : (
              <>
                <span>Unlock Companion</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
      </motion.div>

      {/* Footer Info */}
      <footer style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
          Protected GATE CS 2027 Revision Vault • Offline Sync Enabled
        </p>
      </footer>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <MobileSettingsModal
            onClose={() => setShowSettings(false)}
            onSyncTrigger={() => {}}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
