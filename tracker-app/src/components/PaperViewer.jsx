import React from 'react';
import { ExternalLink, X } from 'lucide-react';

export default function PaperViewer({ title, paperHtml, onClose }) {
  // Open the saved HTML paper in a new browser tab for full screen review
  const handleOpenNewTab = () => {
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(paperHtml);
      newWindow.document.close();
    } else {
      alert('Pop-up blocked. Please allow pop-ups for this site to open the exam sheet.');
    }
  };

  return (
    <div className="glass-card paper-viewer-container" style={{ flexGrow: 1 }}>
      <div className="paper-viewer-header">
        <h2 style={{ fontSize: '16px', fontWeight: '700' }}>{title}</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={handleOpenNewTab}
            className="btn btn-secondary" 
            style={{ padding: '8px 12px', fontSize: '13px' }}
            title="Open Exam in New Tab"
          >
            <ExternalLink size={14} />
            <span>Open Full Screen</span>
          </button>
          <button 
            onClick={onClose}
            className="btn btn-danger" 
            style={{ padding: '8px', borderRadius: '50%' }}
            title="Close Viewer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Renders the offline compiled HTML code inside a sandboxed frame */}
      <iframe
        title="Offline Exam Paper"
        srcDoc={paperHtml}
        sandbox="allow-same-origin allow-popups allow-downloads"
        className="paper-iframe"
        style={{ width: '100%', height: 'calc(100vh - 200px)', border: 'none', background: '#ffffff', borderRadius: '8px' }}
      />
    </div>
  );
}
