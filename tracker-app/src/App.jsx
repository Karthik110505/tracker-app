import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Upload, Download, Trash2, 
  Eye, AlertCircle, FileText, LogOut,
  Menu, X, Edit2, ChevronLeft, ChevronRight,
  Sun, Sunset, Cloud, CloudOff, RefreshCw
} from 'lucide-react';
import { dbService } from './db';
import { apiClient } from './api/client';
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
  const [editingTest, setEditingTest] = useState(null);
  const [sortField, setSortField] = useState('date');
  
  // Mobile UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [showTextBackup, setShowTextBackup] = useState(false);
  const [backupText, setBackupText] = useState('');
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'syncing' | 'offline'
  
  const fileInputRef = useRef(null);

  // Global error listener to alert users to exact JavaScript console errors
  useEffect(() => {
    const handleError = (event) => {
      alert(`App Runtime Error: ${event.message}\nFile: ${event.filename}\nLine: ${event.lineno}`);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Load database content on launch with background cloud sync
  useEffect(() => {
    if (!isLoggedIn) return;
    
    async function loadData() {
      try {
        // 1. Instant load from local IndexedDB for snappy UI
        let f = await dbService.getFolders();
        let t = await dbService.getAllTests();

        // 2. If IndexedDB was empty, attempt recovery from disk backup
        if (f.length === 0 && t.length === 0) {
          await dbService.syncWithDisk();
          f = await dbService.getFolders();
          t = await dbService.getAllTests();
        }

        setFolders(f);
        setTests(t);

        // 3. Trigger cloud sync if authenticated
        if (apiClient.isAuthenticated()) {
          setSyncStatus('syncing');
          const syncRes = await dbService.syncWithCloud();
          if (syncRes && syncRes.success) {
            const updatedF = await dbService.getFolders();
            const updatedT = await dbService.getAllTests();
            setFolders(updatedF);
            setTests(updatedT);
            setSyncStatus('synced');
          } else {
            setSyncStatus('offline');
          }
        }
      } catch (err) {
        console.error('Error initializing database:', err);
        setSyncStatus('offline');
      }
    }
    loadData();
  }, [isLoggedIn]);

  const handleManualSync = async () => {
    setSyncStatus('syncing');
    try {
      const syncRes = await dbService.syncWithCloud();
      if (syncRes && syncRes.success) {
        const f = await dbService.getFolders();
        const t = await dbService.getAllTests();
        setFolders(f);
        setTests(t);
        setSyncStatus('synced');
      } else {
        setSyncStatus('offline');
      }
    } catch (e) {
      setSyncStatus('offline');
    }
  };

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
      apiClient.logout();
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

  // Filter data: If folder is null, we show ALL tests, else filter by folderId
  const activeFolder = React.useMemo(() => {
    return folders.find(f => f.id === activeFolderId);
  }, [folders, activeFolderId]);

  const isGeneral = activeFolderId === null;

  const filteredTests = React.useMemo(() => {
    return isGeneral 
      ? tests 
      : tests.filter(t => t.folderId === activeFolderId);
  }, [tests, isGeneral, activeFolderId]);

  // Sort filtered tests
  const sortedAndFiltered = React.useMemo(() => {
    let list = [...filteredTests];
    list.sort((a, b) => {
      if (sortField === 'date') {
        return new Date(b.date) - new Date(a.date);
      } else if (sortField === 'date-asc') {
        return new Date(a.date) - new Date(b.date);
      } else if (sortField === 'marks-desc') {
        return b.marks - a.marks;
      } else if (sortField === 'marks-asc') {
        return a.marks - b.marks;
      } else if (sortField === 'attempted-desc') {
        return b.attempted - a.attempted;
      } else if (sortField === 'attempted-asc') {
        return a.attempted - b.attempted;
      }
      return 0;
    });
    return list;
  }, [filteredTests, sortField]);

  const getFolderName = (folderId) => {
    const folder = folders.find(f => f.id === folderId);
    return folder ? folder.name : 'Unknown';
  };

  // If not logged in, render the login card
  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="app-layout">
      {isSidebarCollapsed && (
        <div 
          className="sidebar-hover-trigger"
          onMouseEnter={() => setIsSidebarHovered(true)}
        />
      )}
      {isSidebarCollapsed && (
        <button 
          className="sidebar-float-toggle" 
          onClick={() => setIsSidebarCollapsed(false)}
          title="Expand Sidebar"
        >
          <ChevronRight size={16} />
        </button>
      )}
      
      {/* Sidebar Navigation */}
      <aside 
        className={`sidebar ${isSidebarOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''} ${isSidebarHovered ? 'hover-open' : ''}`}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        <div className="logo-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="logo-icon">⚡</div>
            <div className="logo-text">
              <h2>GATE Tracker</h2>
              <span>GATE 2027 Revision Tracker</span>
            </div>
          </div>
          <button 
            className="sidebar-collapse-btn" 
            onClick={() => {
              if (isSidebarCollapsed) {
                setIsSidebarCollapsed(false);
                setIsSidebarHovered(false);
              } else {
                setIsSidebarCollapsed(true);
              }
            }}
            style={{ display: 'flex' }}
            title={isSidebarCollapsed ? "Lock Sidebar Open" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
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
          {/* Cloud Sync Status / Action */}
          <button
            onClick={handleManualSync}
            disabled={syncStatus === 'syncing'}
            className="btn btn-secondary"
            style={{
              width: '100%',
              fontSize: '12px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: syncStatus === 'synced' ? 'rgba(16, 185, 129, 0.08)' : syncStatus === 'syncing' ? 'rgba(99, 102, 241, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              borderColor: syncStatus === 'synced' ? 'rgba(16, 185, 129, 0.3)' : syncStatus === 'syncing' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(239, 68, 68, 0.3)',
            }}
            title="Click to sync changes with MongoDB Atlas"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {syncStatus === 'synced' ? (
                <Cloud size={14} style={{ color: '#10b981' }} />
              ) : syncStatus === 'syncing' ? (
                <RefreshCw size={14} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
              ) : (
                <CloudOff size={14} style={{ color: '#ef4444' }} />
              )}
              <span style={{ fontWeight: 600 }}>
                {syncStatus === 'synced' ? 'Cloud: Synced' : syncStatus === 'syncing' ? 'Syncing...' : 'Local / Offline'}
              </span>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Sync</span>
          </button>

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
            onSaveNotes={async (updatedTest) => {
              await handleSaveTest(updatedTest);
              setSelectedAnalysisTest(updatedTest);
            }}
          />
        ) : currentView === 'logger' ? (
          <TestLoggerModal
            folderId={isGeneral ? null : activeFolderId}
            folders={folders}
            editTest={editingTest}
            onClose={() => {
              setCurrentView('dashboard');
              setEditingTest(null);
            }}
            onSave={(record) => {
              handleSaveTest(record);
              setEditingTest(null);
            }}
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
              folderId={activeFolderId}
              tests={filteredTests}
              folders={folders}
              isGeneral={isGeneral}
            />

            {/* Logged Tests Table Grid */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                  {isGeneral ? 'All Logged Tests History' : `${activeFolder.name} Test History`}
                </h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sort by:</span>
                  <select 
                    value={sortField} 
                    onChange={(e) => setSortField(e.target.value)}
                    className="form-input"
                    style={{ width: 'auto', padding: '6px 12px', fontSize: '13px', height: '34px', minWidth: '160px' }}
                  >
                    <option value="date">Date (Recent First)</option>
                    <option value="date-asc">Date (Oldest First)</option>
                    <option value="marks-desc">Marks (Highest First)</option>
                    <option value="marks-asc">Marks (Lowest First)</option>
                    <option value="attempted-desc">Attempts (Highest First)</option>
                    <option value="attempted-asc">Attempts (Lowest First)</option>
                  </select>
                </div>
              </div>
              
              {sortedAndFiltered.length > 0 ? (
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
                        <th>Rank</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAndFiltered.map((test) => (
                        <tr key={test.id}>
                          {isGeneral && (
                            <td>
                              <span className="badge badge-info" style={{ textTransform: 'uppercase', fontSize: '9px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--color-secondary)' }}>
                                {getFolderName(test.folderId)}
                              </span>
                            </td>
                          )}
                          <td style={{ fontWeight: '600' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{test.title}</span>
                              {test.session === 'morning' && (
                                <Sun size={14} style={{ color: '#f59e0b', flexShrink: 0 }} title="Morning Session" />
                              )}
                              {test.session === 'afternoon' && (
                                <Sunset size={14} style={{ color: '#f43f5e', flexShrink: 0 }} title="Afternoon Session" />
                              )}
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>{test.date}</td>
                          <td>
                            <span className="badge badge-success">
                              {test.marks.toFixed(2)} / {test.totalMarks}
                            </span>
                          </td>
                          <td style={{ color: 'var(--color-secondary)', fontWeight: '600' }}>{test.accuracy}</td>
                          <td>{test.attempted} / {test.totalQs}</td>
                          <td>
                            {test.rankGot ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontWeight: '600' }}>
                                  {test.rankGot} / {test.totalCandidates || '-'}
                                </span>
                                {test.totalCandidates && (
                                  <span style={{ fontSize: '10px', color: '#ec4899', fontWeight: '500' }}>
                                    Top {(((test.rankGot / test.totalCandidates) * 100) < 0.01 
                                      ? ((test.rankGot / test.totalCandidates) * 100).toFixed(4) 
                                      : ((test.rankGot / test.totalCandidates) * 100).toFixed(2))}%
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-dark)', fontSize: '12px' }}>-</span>
                            )}
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
                                onClick={() => { setEditingTest(test); setCurrentView('logger'); }} 
                                className="btn btn-secondary" 
                                style={{ padding: '6px', borderRadius: '6px' }}
                                title="Edit Test Result"
                              >
                                <Edit2 size={14} />
                              </button>
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
