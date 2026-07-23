import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderPlus, Plus, Upload, Download, Trash2, 
  Eye, BookOpen, AlertCircle, FileText, CheckCircle, LogOut,
  Menu, X
} from 'lucide-react';
import { dbService } from './db';
import FolderNav from './components/FolderNav';
import Dashboard from './components/Dashboard';
import TestLoggerModal from './components/TestLoggerModal';
import PaperViewer from './components/PaperViewer';
import Login from './components/Login';
import TestAnalysis from './components/TestAnalysis';

export default function App() {
  // Check if session token exists in local storage
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('gate_tracker_auth') === 'true';
  });

  const [folders, setFolders] = useState([]);
  const [tests, setTests] = useState([]);
  
  // activeFolderId starts as null (General Dashboard)
  const [activeFolderId, setActiveFolderId] = useState(null);
  
  // View states: 'dashboard', 'logger'
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [selectedAnalysisTest, setSelectedAnalysisTest] = useState(null);
  
  // Mobile UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showTextBackup, setShowTextBackup] = useState(false);
  const [backupText, setBackupText] = useState('');
  
  const fileInputRef = useRef(null);

  // Global error listener to alert users to exact JavaScript console errors
  useEffect(() => {
    const handleError = (event) => {
      alert(`App Runtime Error: ${event.message}\nFile: ${event.filename}\nLine: ${event.lineno}`);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Load database content on launch
  useEffect(() => {
    if (!isLoggedIn) return;
    
    async function loadData() {
      try {
        const f = await dbService.getFolders();
        const t = await dbService.getAllTests();
        setFolders(f);
        setTests(t);
      } catch (err) {
        console.error('Error initializing database:', err);
      }
    }
    loadData();
  }, [isLoggedIn]);

  // Folder Operations
  const handleCreateFolder = async (folder) => {
    try {
      await dbService.saveFolder(folder);
      setFolders(prev => [...prev, folder]);
      setActiveFolderId(folder.id);
      setSelectedPaper(null); // Clear paper viewer
      setCurrentView('dashboard');
    } catch (e) {
      alert('Failed to create folder: ' + e.message);
    }
  };

  const handleDeleteFolder = async (folderId) => {
    try {
      await dbService.deleteFolder(folderId);
      setFolders(prev => prev.filter(f => f.id !== folderId));
      setTests(prev => prev.filter(t => t.folderId !== folderId));
      setActiveFolderId(null);
      setSelectedPaper(null);
      setCurrentView('dashboard');
    } catch (e) {
      alert('Failed to delete folder: ' + e.message);
    }
  };

  // Test Operations
  const handleSaveTest = async (testRecord) => {
    try {
      await dbService.saveTest(testRecord);
      setTests(prev => {
        const exists = prev.some(t => t.id === testRecord.id);
        if (exists) {
          return prev.map(t => t.id === testRecord.id ? testRecord : t);
        } else {
          return [...prev, testRecord];
        }
      });
      setCurrentView('dashboard');
    } catch (e) {
      alert('Failed to save test record: ' + e.message);
    }
  };

  const handleDeleteTest = async (testId) => {
    if (!confirm('Are you sure you want to delete this test result?')) return;
    try {
      await dbService.deleteTest(testId);
      setTests(prev => prev.filter(t => t.id !== testId));
      if (selectedPaper && selectedPaper.id === testId) {
        setSelectedPaper(null);
      }
    } catch (e) {
      alert('Failed to delete test: ' + e.message);
    }
  };

  // Backup & Import Operations
  const handleExportBackup = async () => {
    try {
      const dataStr = await dbService.exportDatabase();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GATE_Tracker_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to export backup: ' + e.message);
    }
  };

  const handleImportBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        await dbService.importDatabase(event.target.result);
        alert('Database restored successfully!');
        
        // Reload states
        const f = await dbService.getFolders();
        const t = await dbService.getAllTests();
        setFolders(f);
        setTests(t);
        setActiveFolderId(null); // Return to General Dashboard
        setSelectedPaper(null);
        setCurrentView('dashboard');
      } catch (err) {
        alert('Restore failed. Invalid backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Authentication logout
  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('gate_tracker_auth');
      setIsLoggedIn(false);
      setSelectedPaper(null);
      setCurrentView('dashboard');
    }
  };

  const handleOpenTextBackup = async () => {
    try {
      const dataStr = await dbService.exportDatabase();
      setBackupText(dataStr);
      setShowTextBackup(true);
    } catch (e) {
      alert('Failed to generate text backup: ' + e.message);
    }
  };

  const handleImportTextBackup = async () => {
    if (!backupText.trim()) return;
    try {
      await dbService.importDatabase(backupText);
      alert('Database restored successfully from text backup!');
      
      // Reload states
      const f = await dbService.getFolders();
      const t = await dbService.getAllTests();
      setFolders(f);
      setTests(t);
      setActiveFolderId(null); // Return to General Dashboard
      setSelectedPaper(null);
      setCurrentView('dashboard');
      setShowTextBackup(false);
    } catch (err) {
      alert('Restore failed. Invalid JSON text: ' + err.message);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(backupText);
    alert('Backup JSON copied to clipboard!');
  };

  // If not logged in, render the login card
  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  // Filter data: If folder is null, we show ALL tests, else filter by folderId
  const activeFolder = folders.find(f => f.id === activeFolderId);
  const isGeneral = activeFolderId === null;
  const filteredTests = isGeneral 
    ? tests 
    : tests.filter(t => t.folderId === activeFolderId);

  const getFolderName = (folderId) => {
    const folder = folders.find(f => f.id === folderId);
    return folder ? folder.name : 'Unknown';
  };

  return (
    <div className="app-layout">
      
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="logo-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="logo-icon">⚡</div>
            <div className="logo-text">
              <h2>GATE Tracker</h2>
              <span>GATE 2027 Revision Tracker</span>
            </div>
          </div>
          <button className="mobile-close-btn" onClick={() => setIsSidebarOpen(false)} style={{ display: 'none' }}>
            <X size={20} />
          </button>
        </div>

        {/* Foldernav component */}
        <FolderNav
          folders={folders}
          activeFolderId={activeFolderId}
          onSelectFolder={(id) => {
            setActiveFolderId(id);
            setSelectedPaper(null); // Close paper viewer
            setCurrentView('dashboard'); // Return to dashboard view
            setIsSidebarOpen(false); // Close sidebar on mobile
          }}
          onCreateFolder={handleCreateFolder}
          onDeleteFolder={handleDeleteFolder}
        />

        {/* Import / Export / Logout Utility */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-card)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportBackup}
            style={{ display: 'none' }}
          />
          <button 
            onClick={handleExportBackup} 
            className="btn btn-secondary" 
            style={{ width: '100%', fontSize: '12px', padding: '8px 12px' }}
          >
            <Download size={14} />
            <span>Export Backup</span>
          </button>
          <button 
            onClick={() => fileInputRef.current.click()} 
            className="btn btn-secondary" 
            style={{ width: '100%', fontSize: '12px', padding: '8px 12px' }}
          >
            <Upload size={14} />
            <span>Import Backup</span>
          </button>
          <button 
            onClick={handleOpenTextBackup} 
            className="btn btn-secondary" 
            style={{ width: '100%', fontSize: '12px', padding: '8px 12px' }}
          >
            <FileText size={14} />
            <span>Text Backup/Restore</span>
          </button>
          <button 
            onClick={handleLogout} 
            className="btn btn-danger" 
            style={{ width: '100%', fontSize: '12px', padding: '8px 12px', marginTop: '4px' }}
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Pane */}
      <main className="main-content">
        
        {/* Mobile Header Bar */}
        <div className="mobile-header">
          <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="mobile-title">GATE Tracker</div>
        </div>
        
        {/* View Switcher Routing */}
        {selectedPaper ? (
          <PaperViewer
            title={selectedPaper.title}
            paperHtml={selectedPaper.paperHtml}
            onClose={() => setSelectedPaper(null)}
          />
        ) : selectedAnalysisTest ? (
          <TestAnalysis
            test={selectedAnalysisTest}
            onClose={() => setSelectedAnalysisTest(null)}
          />
        ) : currentView === 'logger' ? (
          <TestLoggerModal
            folderId={isGeneral ? null : activeFolderId}
            folders={folders}
            onClose={() => setCurrentView('dashboard')}
            onSave={handleSaveTest}
          />
        ) : (
          <>
            <div className="dashboard-header">
              <div className="dashboard-title">
                <h1>{isGeneral ? 'General Dashboard' : activeFolder.name}</h1>
                <p>
                  {isGeneral 
                    ? 'Aggregated performance metrics across all of your classes, categories, and folders' 
                    : 'Track mock test statistics, review performance history, and analyze progress'}
                </p>
              </div>
              <div className="header-actions">
                {/* Allow logging a test from anywhere, as long as at least one folder exists */}
                {folders.length > 0 && (
                  <button 
                    onClick={() => setCurrentView('logger')} 
                    className="btn btn-primary"
                  >
                    <Plus size={16} />
                    <span>Log Test Result</span>
                  </button>
                )}
              </div>
            </div>

            {/* Dashboard component */}
            <Dashboard 
              folderName={isGeneral ? 'General Dashboard' : activeFolder.name} 
              tests={filteredTests}
              folders={folders}
              isGeneral={isGeneral}
            />

            {/* Logged Tests Table Grid */}
            <div className="glass-card">
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                {isGeneral ? 'All Logged Tests History' : `${activeFolder.name} Test History`}
              </h3>
              
              {filteredTests.length > 0 ? (
                <div className="records-table-container">
                  <table className="records-table">
                    <thead>
                      <tr>
                        {isGeneral && <th>Category</th>}
                        <th>Exam Name</th>
                        <th>Date</th>
                        <th>Marks</th>
                        <th>Accuracy</th>
                        <th>Attempts</th>
                        <th>Duration</th>
                        <th>Tags</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTests.map((test) => (
                        <tr key={test.id}>
                          {isGeneral && (
                            <td>
                              <span className="badge badge-info" style={{ textTransform: 'uppercase', fontSize: '9px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--color-secondary)' }}>
                                {getFolderName(test.folderId)}
                              </span>
                            </td>
                          )}
                          <td style={{ fontWeight: '600' }}>{test.title}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{test.date}</td>
                          <td>
                            <span className="badge badge-success">
                              {test.marks.toFixed(2)} / {test.totalMarks}
                            </span>
                          </td>
                          <td style={{ color: 'var(--color-secondary)', fontWeight: '600' }}>{test.accuracy}</td>
                          <td>{test.attempted} / {test.totalQs}</td>
                          <td>{test.timeTaken} ({test.duration})</td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {test.tags.map((t, idx) => (
                                <span key={idx} className="badge badge-info" style={{ fontSize: '9px', padding: '2px 6px' }}>
                                  {t}
                                </span>
                              ))}
                              {test.tags.length === 0 && <span style={{ color: 'var(--text-dark)', fontSize: '12px' }}>-</span>}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                              {test.paperHtml ? (
                                <>
                                  <button 
                                    onClick={() => setSelectedAnalysisTest(test)} 
                                    className="btn btn-primary" 
                                    style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '6px', whiteSpace: 'nowrap' }}
                                    title="See Results Breakdown"
                                  >
                                    See Results
                                  </button>
                                  <button 
                                    onClick={() => setSelectedPaper(test)} 
                                    className="btn btn-secondary" 
                                    style={{ padding: '6px', borderRadius: '6px' }}
                                    title="View Embedded Paper"
                                  >
                                    <Eye size={14} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '6px', opacity: 0.3, cursor: 'not-allowed', whiteSpace: 'nowrap' }}>
                                    See Results
                                  </span>
                                  <span className="btn btn-secondary" style={{ padding: '6px', borderRadius: '6px', opacity: 0.3, cursor: 'not-allowed' }}>
                                    <Eye size={14} />
                                  </span>
                                </>
                              )}
                              <button 
                                onClick={() => handleDeleteTest(test.id)} 
                                className="btn btn-danger" 
                                style={{ padding: '6px', borderRadius: '6px' }}
                                title="Delete Result"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <AlertCircle size={24} style={{ margin: '0 auto 8px auto', color: 'var(--text-dark)' }} />
                  <p style={{ fontSize: '14px' }}>No test results logged yet.</p>
                  {folders.length > 0 && (
                    <button 
                      onClick={() => setCurrentView('logger')} 
                      className="btn btn-secondary" 
                      style={{ marginTop: '12px', fontSize: '13px' }}
                    >
                      Log your first result
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Sidebar Backdrop Overlay */}
      {isSidebarOpen && <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* Text Backup / Restore Modal */}
      {showTextBackup && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Text Backup / Restore</h2>
              <button className="btn-close-modal" onClick={() => setShowTextBackup(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Copy the text below to save a backup, or paste your backup text and click "Import / Restore" to restore your data.
              </p>
              <textarea
                style={{
                  width: '100%',
                  height: '160px',
                  background: '#070913',
                  border: '1px solid var(--border-card)',
                  borderRadius: '8px',
                  color: 'var(--text-main)',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  padding: '10px',
                  resize: 'none'
                }}
                value={backupText}
                onChange={(e) => setBackupText(e.target.value)}
                placeholder="Paste backup JSON data here..."
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={handleCopyToClipboard} className="btn btn-secondary" style={{ fontSize: '12px', padding: '8px 12px' }}>
                  Copy to Clipboard
                </button>
                <button onClick={handleImportTextBackup} className="btn btn-primary" style={{ fontSize: '12px', padding: '8px 12px' }}>
                  Import / Restore
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
