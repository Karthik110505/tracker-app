import React, { useState } from 'react';
import { Lock, AlertCircle, KeyRound } from 'lucide-react';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === 'Karthik@1155') {
      localStorage.setItem('gate_tracker_auth', 'true');
      onLogin();
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at center, #0f172a 0%, #070913 100%)',
      padding: '20px'
    }}>
      <div class="glass-card" style={{
        width: '100%',
        maxWidth: '400px',
        padding: '32px',
        textAlign: 'center',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        boxShadow: '0 10px 40px rgba(139, 92, 246, 0.15)',
        animation: 'slideUp 0.4s ease-out'
      }}>
        
        {/* Lock Icon header */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.15))',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto',
          color: 'var(--color-secondary)',
          boxShadow: '0 0 20px var(--glow-secondary)'
        }}>
          <Lock size={28} />
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '6px', letterSpacing: '0.5px' }}>
          Portal Locked
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '28px' }}>
          Enter password to access your GATE 2027 revision portal
        </p>

        {error && (
          <div class="subfolder-warning" style={{ 
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(false);
              }}
              class="form-input"
              style={{ 
                paddingLeft: '40px',
                fontSize: '15px',
                letterSpacing: '3px'
              }}
              autoFocus
              required
            />
            <div style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-dark)',
              display: 'flex',
              alignItems: 'center'
            }}>
              <KeyRound size={16} />
            </div>
          </div>

          <button type="submit" class="btn btn-primary" style={{ padding: '12px', fontSize: '15px' }}>
            Unlock Portal
          </button>
        </form>
      </div>
    </div>
  );
}
