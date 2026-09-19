import React, { useState, useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { 
  LayoutDashboard, BookOpen, TrendingUp, FolderTree, 
  Cloud, CloudOff, RefreshCw, Settings, LogOut, WifiOff, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { dbService } from '../../db';
import { apiClient } from '../../api/client';
import { DEFAULT_MOBILE_DATA } from './defaultMobileData';
import MobileHome from './MobileHome';
import MobileTestList from './MobileTestList';
import MobileAnalytics from './MobileAnalytics';
import MobileCategories from './MobileCategories';
import MobileTestDetail from './MobileTestDetail';
import MobileTestLoggerModal from './MobileTestLoggerModal';
import MobileSettingsModal from './MobileSettingsModal';
import MobileLogin from './MobileLogin';

export default function MobileApp({
  folders: propFolders,
  tests: propTests,
  syncStatus: propSyncStatus,
  onManualSync: propManualSync,
  onLogout: propLogout,
  onExitPreview,
  isPreview = false
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('gate_tracker_auth') === 'true';
  });

  const [internalFolders, setInternalFolders] = useState([]);
  const [internalTests, setInternalTests] = useState([]);
  const [internalSyncStatus, setInternalSyncStatus] = useState('synced'); // 'synced' | 'syncing' | 'offline'

  const folders = propFolders || internalFolders;
  const tests = propTests || internalTests;
  const syncStatus = propSyncStatus || internalSyncStatus;

  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'tests' | 'analytics' | 'categories'
  const [selectedTest, setSelectedTest] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showLoggerModal, setShowLoggerModal] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Synchronous refs to access latest navigation state in Capacitor backButton listener
  const selectedTestRef = useRef(selectedTest);
  const showSettingsRef = useRef(showSettings);
  const showLoggerModalRef = useRef(showLoggerModal);
  const activeTabRef = useRef(activeTab);
  const selectedCategoryFilterRef = useRef(selectedCategoryFilter);

  useEffect(() => {
    selectedTestRef.current = selectedTest;
  }, [selectedTest]);

  useEffect(() => {
    showSettingsRef.current = showSettings;
  }, [showSettings]);

  useEffect(() => {
    showLoggerModalRef.current = showLoggerModal;
  }, [showLoggerModal]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    selectedCategoryFilterRef.current = selectedCategoryFilter;
  }, [selectedCategoryFilter]);

  // Load local data and trigger cloud sync
  const loadLocalDataAndSync = async () => {
    try {
      let f = await dbService.getFolders();
      let t = await dbService.getAllTests();

      // Direct offline seed: Ensure all 20 tests and 3 categories are loaded directly into IndexedDB
      if (t.length < DEFAULT_MOBILE_DATA.tests.length || f.length < DEFAULT_MOBILE_DATA.folders.length) {
        console.log(`[MOBILE DIRECT SEED] Local count: ${t.length} tests, ${f.length} folders. Seeding all ${DEFAULT_MOBILE_DATA.tests.length} bundled tests...`);
        await dbService.seedDefaultData(DEFAULT_MOBILE_DATA.folders, DEFAULT_MOBILE_DATA.tests);
        f = await dbService.getFolders();
        t = await dbService.getAllTests();
      }

      setInternalFolders(f);
      setInternalTests(t);

      // Now trigger cloud sync if authenticated and online
      if (apiClient.isAuthenticated() && navigator.onLine) {
        setInternalSyncStatus('syncing');
        const syncRes = await dbService.syncWithCloud();
        if (syncRes && syncRes.success) {
          const updatedF = await dbService.getFolders();
          const updatedT = await dbService.getAllTests();
          setInternalFolders(updatedF);
          setInternalTests(updatedT);
          setInternalSyncStatus('synced');
        } else {
          setInternalSyncStatus('offline');
        }
      }
    } catch (err) {
      console.error('[MOBILE INIT ERROR]:', err);
      setInternalSyncStatus('offline');
    }
  };

  const handleSaveNewTest = async (newTest) => {
    try {
      await dbService.saveTest(newTest);
      const updatedT = await dbService.getAllTests();
      setInternalTests(updatedT);
      return true;
    } catch (err) {
      console.error('Error saving new test on mobile:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (isLoggedIn && !propTests) {
      loadLocalDataAndSync();
    }
  }, [isLoggedIn]);

  const handleManualSync = async () => {
    if (propManualSync) {
      return propManualSync();
    }
    setInternalSyncStatus('syncing');
    try {
      const syncRes = await dbService.syncWithCloud();
      const updatedF = await dbService.getFolders();
      const updatedT = await dbService.getAllTests();
      setInternalFolders(updatedF);
      setInternalTests(updatedT);
      setInternalSyncStatus(syncRes && syncRes.success ? 'synced' : 'offline');
    } catch (e) {
      setInternalSyncStatus('offline');
    }
  };

  const handleLogout = () => {
    if (propLogout) {
      return propLogout();
    }
    apiClient.logout();
    localStorage.removeItem('gate_tracker_auth');
    setIsLoggedIn(false);
  };

  // Hardware/System Android Back Button Handler
  useEffect(() => {
    let backListenerHandle = null;

    async function registerBackButton() {
      try {
        backListenerHandle = await CapacitorApp.addListener('backButton', () => {
          // 0. If Test Logger modal is open: close it
          if (showLoggerModalRef.current) {
            setShowLoggerModal(false);
            return;
          }

          // 1. If Test Details modal is open: close it and stay in tests list
          if (selectedTestRef.current) {
            setSelectedTest(null);
            return;
          }

          // 2. If Settings modal is open: close it
          if (showSettingsRef.current) {
            setShowSettings(false);
            return;
          }

          // 3. If in tests and a category filter chip is active: clear filter
          if (activeTabRef.current === 'tests' && selectedCategoryFilterRef.current) {
            setSelectedCategoryFilter(null);
            return;
          }

          // 4. If on another tab (tests, analytics, categories): navigate back to Dashboard
          if (activeTabRef.current !== 'home') {
            setActiveTab('home');
            setSelectedCategoryFilter(null);
            return;
          }

          // 5. If already at root Dashboard ('home') with no active modals: exit / minimize app
          CapacitorApp.exitApp();
        });
      } catch (err) {
        // CapacitorApp plugin unavailable (e.g. standard browser desktop preview)
      }
    }

    registerBackButton();

    return () => {
      if (backListenerHandle && backListenerHandle.remove) {
        backListenerHandle.remove();
      }
    };
  }, []);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      handleManualSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleTabChange = (tabName, folderId = null) => {
    setActiveTab(tabName);
    if (folderId !== undefined) {
      setSelectedCategoryFilter(folderId);
    }
  };

  // If user is unauthenticated on mobile, show dedicated MobileLogin
  if (!isLoggedIn) {
    return (
      <MobileLogin 
        onLogin={() => {
          setIsLoggedIn(true);
          loadLocalDataAndSync();
        }} 
      />
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#0b1329',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      position: 'relative'
    }}>
      {/* Desktop Preview Header */}
      {isPreview && (
        <div style={{
          backgroundColor: '#312e81',
          color: '#e0e7ff',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          fontWeight: 600,
          zIndex: 60,
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <span>📱 Mobile Preview Mode (Capacitor Android Companion)</span>
          <button
            onClick={onExitPreview || (() => { window.location.href = '/'; })}
            style={{
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Return to Desktop View
          </button>
        </div>
      )}
      
      {/* --- TOP MOBILE HEADER --- */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(11, 19, 41, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            boxShadow: '0 2px 10px rgba(99, 102, 241, 0.4)'
          }}>
            ⚡
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 800, margin: 0, letterSpacing: '0.2px', color: '#f8fafc' }}>
              GATE Tracker
            </h1>
            <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginTop: '-1px' }}>
              2027 Revision Portal
            </span>
          </div>
        </div>

        {/* Right Controls: Sync Pill, Settings & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Live Sync Pill */}
          <button
            onClick={handleManualSync}
            disabled={syncStatus === 'syncing'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 9px',
              borderRadius: '20px',
              border: 'none',
              background: syncStatus === 'synced' ? 'rgba(16, 185, 129, 0.15)' : syncStatus === 'syncing' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(239, 68, 68, 0.15)',
              color: syncStatus === 'synced' ? '#34d399' : syncStatus === 'syncing' ? '#a5b4fc' : '#f87171',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Tap to trigger cloud sync"
          >
            {syncStatus === 'synced' ? (
              <Cloud size={13} style={{ color: '#10b981' }} />
            ) : syncStatus === 'syncing' ? (
              <RefreshCw size={13} style={{ color: '#818cf8', animation: 'spin 1s linear infinite' }} />
            ) : (
              <CloudOff size={13} style={{ color: '#ef4444' }} />
            )}
            <span>
              {syncStatus === 'synced' ? 'Synced' : syncStatus === 'syncing' ? 'Syncing...' : 'Offline'}
            </span>
          </button>

          {/* Settings button */}
          <button
            onClick={() => setShowSettings(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#cbd5e1',
              cursor: 'pointer'
            }}
            title="Cloud settings & endpoint"
          >
            <Settings size={15} />
          </button>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f87171',
              cursor: 'pointer'
            }}
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Offline banner notification */}
      {!isOnline && (
        <div style={{
          backgroundColor: '#ef4444',
          color: '#ffffff',
          fontSize: '11px',
          fontWeight: 700,
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}>
          <WifiOff size={13} />
          <span>Device is offline. Showing cached tests from IndexedDB.</span>
        </div>
      )}

      {/* --- MAIN MOBILE CONTENT VIEW --- */}
      <main style={{ flex: 1 }}>
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <MobileHome
                tests={tests}
                folders={folders}
                onSelectTest={setSelectedTest}
                onNavigateTab={handleTabChange}
                onOpenLogger={() => setShowLoggerModal(true)}
              />
            </motion.div>
          )}

          {activeTab === 'tests' && (
            <motion.div
              key="tests"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <MobileTestList
                tests={tests}
                folders={folders}
                initialFolderId={selectedCategoryFilter}
                onSelectTest={setSelectedTest}
                onOpenLogger={() => setShowLoggerModal(true)}
              />
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <MobileAnalytics
                tests={tests}
                folders={folders}
                onSelectTest={setSelectedTest}
              />
            </motion.div>
          )}

          {activeTab === 'categories' && (
            <motion.div
              key="categories"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <MobileCategories
                folders={folders}
                tests={tests}
                onSelectTest={setSelectedTest}
                onNavigateTab={handleTabChange}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- FLOATING ACTION BUTTON: LOG TEST --- */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setShowLoggerModal(true)}
        aria-label="Log new test"
        style={{
          position: 'fixed',
          right: '18px',
          bottom: 'calc(74px + env(safe-area-inset-bottom, 0px))',
          zIndex: 45,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 18px',
          borderRadius: '30px',
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          boxShadow: '0 8px 25px rgba(99, 102, 241, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: '13px',
          letterSpacing: '0.3px'
        }}
      >
        <Plus size={18} strokeWidth={2.5} />
        <span>Log Test</span>
      </motion.button>

      {/* --- FIXED BOTTOM NAVIGATION BAR --- */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: 'rgba(11, 19, 41, 0.95)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '8px 0',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
        boxShadow: '0 -5px 25px rgba(0, 0, 0, 0.5)'
      }}>
        {[
          { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'tests', label: 'Tests', icon: BookOpen },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp },
          { id: 'categories', label: 'Categories', icon: FolderTree }
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                background: 'none',
                border: 'none',
                color: isActive ? '#818cf8' : '#64748b',
                cursor: 'pointer',
                padding: '6px 0',
                position: 'relative'
              }}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span style={{
                fontSize: '11px',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.2px'
              }}>
                {item.label}
              </span>

              {/* Active indicator dot */}
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  style={{
                    position: 'absolute',
                    bottom: '0',
                    width: '16px',
                    height: '2px',
                    backgroundColor: '#818cf8',
                    borderRadius: '1px'
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* --- TEST DETAIL SHEET MODAL --- */}
      <AnimatePresence>
        {selectedTest && (
          <MobileTestDetail
            test={selectedTest}
            folders={folders}
            onClose={() => setSelectedTest(null)}
          />
        )}
      </AnimatePresence>

      {/* --- TEST LOGGER MODAL --- */}
      <AnimatePresence>
        {showLoggerModal && (
          <MobileTestLoggerModal
            folders={folders}
            onClose={() => setShowLoggerModal(false)}
            onSave={handleSaveNewTest}
          />
        )}
      </AnimatePresence>

      {/* --- CONNECTION SETTINGS MODAL --- */}
      <AnimatePresence>
        {showSettings && (
          <MobileSettingsModal
            onClose={() => setShowSettings(false)}
            onSyncTrigger={handleManualSync}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
