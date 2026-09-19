import React, { useState } from 'react';
import { Lock, AlertCircle, KeyRound, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiClient } from '../api/client';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError(false);

    try {
      // 1. Authenticate with backend API
      const res = await apiClient.login(password);
      if (res && res.success) {
        onLogin();
        return;
      }
    } catch (apiErr) {
      console.warn('Cloud login attempt failed (server offline or unreachable):', apiErr.message);
      // 2. Offline fallback: allow local password match so offline preparation is never blocked
      if (password === 'Karthik@1155') {
        localStorage.setItem('gate_tracker_auth', 'true');
        onLogin();
        return;
      }
    } finally {
      setLoading(false);
    }

    setError(true);
    setPassword('');
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background blobs inside login screen */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '20%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '20%',
        width: '350px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      <motion.div 
        className="glass-card" 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '40px 32px',
          textAlign: 'center',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          position: 'relative',
          zIndex: 1
        }}
      >
        
        {/* Lock Icon header */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.15))',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px auto',
          color: 'var(--color-secondary)',
          animation: 'pulseGlow 2.5s infinite ease-in-out'
        }}>
          <Lock size={30} />
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', letterSpacing: '0.5px', background: 'linear-gradient(to right, #ffffff, var(--color-primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Portal Locked
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '28px' }}>
          Enter password to access your GATE 2027 revision portal
        </p>

        {error && (
          <div className="subfolder-warning" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>Incorrect password. Please try again.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(false);
              }}
              className="form-input"
              style={{ 
                paddingLeft: '44px',
                fontSize: '15px',
                letterSpacing: '4px'
              }}
              autoFocus
              required
            />
            <div style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none'
            }}>
              <KeyRound size={16} />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ 
              padding: '12px', 
              fontSize: '15px', 
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Verifying...</span>
              </>
            ) : (
              'Unlock Portal'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
