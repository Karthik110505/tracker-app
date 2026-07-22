import React from 'react';
import { ExternalLink, X } from 'lucide-react';

export default function PaperViewer({ title, paperHtml, onClose }) {
  const handleOpenNewTab = () => {
    try {
      const blob = new Blob([paperHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e) {
      console.error('Failed to open paper in new tab:', e);
      alert('Could not open paper in a new tab. Please try viewing it in the frame below.');
    }
  };

  return (
    <div class="glass-card paper-viewer-container" style={{ flexGrow: 1 }}>
      <div class="paper-viewer-header">
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>📄 Exam Paper: {title}</h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Viewing sandboxed offline document loaded from local database
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={handleOpenNewTab} 
            class="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '12px' }}
            title="Open Fullscreen in New Tab"
          >
            <ExternalLink size={14} />
            <span>Fullscreen</span>
          </button>
          
          <button 
            onClick={onClose} 
            class="btn btn-danger" 
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            <X size={14} />
            <span>Close Paper</span>
          </button>
        </div>
      </div>
      
      <iframe
        title="Exam Paper Viewer"
        srcDoc={paperHtml}
        sandbox="allow-same-origin allow-popups allow-downloads"
        class="paper-iframe"
        style={{ flexGrow: 1, minHeight: '500px', width: '100%', border: '1px solid var(--border-card)', borderRadius: '8px' }}
      />
    </div>
  );
}
