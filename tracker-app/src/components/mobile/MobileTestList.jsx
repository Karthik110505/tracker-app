import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Calendar, Award, CheckCircle, 
  Clock, ArrowUpDown, Sun, Sunset, ChevronRight, X, Plus 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MobileTestList({ tests = [], folders = [], initialFolderId = null, onSelectTest, onOpenLogger }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState(initialFolderId);
  const [selectedYear, setSelectedYear] = useState('All');
  const [sortOption, setSortOption] = useState('date-desc'); // 'date-desc' | 'date-asc' | 'marks-desc' | 'marks-asc' | 'acc-desc'
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Extract unique years
  const availableYears = useMemo(() => {
    const years = tests.map(t => {
      const match = t.title.match(/\b(19|20)\d{2}\b/);
      return match ? match[0] : null;
    }).filter(Boolean);
    return ['All', ...Array.from(new Set(years)).sort((a, b) => b - a)];
  }, [tests]);

  // Filter and sort tests
  const filteredTests = useMemo(() => {
    return tests
      .filter(t => {
        // Folder filter
        if (selectedFolderId && t.folderId !== selectedFolderId) return false;

        // Year filter
        if (selectedYear !== 'All') {
          const yearMatch = t.title.match(/\b(19|20)\d{2}\b/);
          if (!yearMatch || yearMatch[0] !== selectedYear) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const titleMatch = t.title.toLowerCase().includes(q);
          const notesMatch = t.notes && t.notes.toLowerCase().includes(q);
          const tagsMatch = t.tags && t.tags.some(tag => tag.toLowerCase().includes(q));
          if (!titleMatch && !notesMatch && !tagsMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'date-desc') return new Date(b.date) - new Date(a.date);
        if (sortOption === 'date-asc') return new Date(a.date) - new Date(b.date);
        if (sortOption === 'marks-desc') return (b.marks || 0) - (a.marks || 0);
        if (sortOption === 'marks-asc') return (a.marks || 0) - (b.marks || 0);
        if (sortOption === 'acc-desc') return (parseInt(b.accuracy) || 0) - (parseInt(a.accuracy) || 0);
        return 0;
      });
  }, [tests, selectedFolderId, selectedYear, searchQuery, sortOption]);

  const getFolder = (folderId) => folders.find(f => f.id === folderId);

  return (
    <div style={{ padding: '16px 16px 85px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* Header & Count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
            Exam History
          </h2>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            Showing {filteredTests.length} of {tests.length} tests
          </span>
        </div>

        {/* Action Group: Log Test + Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onOpenLogger && (
            <button
              onClick={onOpenLogger}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 12px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)'
              }}
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Log</span>
            </button>
          )}

          {/* Sort Trigger */}
          <button
            onClick={() => setShowSortMenu(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '10px',
              background: showSortMenu ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${showSortMenu ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
              color: showSortMenu ? '#a5b4fc' : '#cbd5e1',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <ArrowUpDown size={13} />
            <span>Sort</span>
          </button>
        </div>
      </div>

      {/* Sort Dropdown Popup */}
      <AnimatePresence>
        {showSortMenu && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              background: '#1e293b',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '14px',
              padding: '8px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)'
            }}
          >
            {[
              { id: 'date-desc', label: 'Latest Date' },
              { id: 'date-asc', label: 'Oldest Date' },
              { id: 'marks-desc', label: 'Highest Marks' },
              { id: 'marks-asc', label: 'Lowest Marks' },
              { id: 'acc-desc', label: 'Highest Accuracy' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  setSortOption(opt.id);
                  setShowSortMenu(false);
                }}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: sortOption === opt.id ? 700 : 500,
                  background: sortOption === opt.id ? '#6366f1' : 'transparent',
                  color: sortOption === opt.id ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Input */}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="Search by test name, subject, or year..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '11px 36px 11px 38px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(30, 41, 59, 0.6)',
            color: '#f8fafc',
            fontSize: '13px',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        <Search size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter Chips: Category Folders */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '4px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        <button
          onClick={() => setSelectedFolderId(null)}
          style={{
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            background: selectedFolderId === null ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
            color: selectedFolderId === null ? '#ffffff' : '#cbd5e1',
            border: `1px solid ${selectedFolderId === null ? '#6366f1' : 'rgba(255, 255, 255, 0.1)'}`,
            cursor: 'pointer'
          }}
        >
          All Categories
        </button>
        {folders.map(f => (
          <button
            key={f.id}
            onClick={() => setSelectedFolderId(f.id)}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              background: selectedFolderId === f.id ? f.color || '#6366f1' : 'rgba(255, 255, 255, 0.05)',
              color: selectedFolderId === f.id ? '#ffffff' : '#cbd5e1',
              border: `1px solid ${selectedFolderId === f.id ? f.color || '#6366f1' : 'rgba(255, 255, 255, 0.1)'}`,
              cursor: 'pointer'
            }}
          >
            {f.name}
          </button>
        ))}
      </div>

      {/* Filter Chips: Years (horizontal scroll) */}
      {availableYears.length > 2 && (
        <div style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '4px',
          scrollbarWidth: 'none'
        }}>
          {availableYears.map(yr => (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: selectedYear === yr ? 700 : 500,
                whiteSpace: 'nowrap',
                background: selectedYear === yr ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                color: selectedYear === yr ? '#a5b4fc' : '#94a3b8',
                border: `1px solid ${selectedYear === yr ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.06)'}`,
                cursor: 'pointer'
              }}
            >
              {yr === 'All' ? 'All Years' : yr}
            </button>
          ))}
        </div>
      )}

      {/* Test Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredTests.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            background: 'rgba(30, 41, 59, 0.3)',
            borderRadius: '16px',
            border: '1px dashed rgba(255, 255, 255, 0.1)'
          }}>
            <Calendar size={32} style={{ color: '#64748b', margin: '0 auto 8px auto' }} />
            <h4 style={{ fontSize: '15px', color: '#cbd5e1', margin: '0 0 4px 0' }}>No tests match your filter</h4>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Try clearing filters or search terms.</p>
          </div>
        ) : (
          filteredTests.map((test, index) => {
            const folder = getFolder(test.folderId);
            const folderColor = folder?.color || '#6366f1';
            const folderName = folder?.name || 'General';

            return (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
                onClick={() => onSelectTest && onSelectTest(test)}
                style={{
                  background: 'rgba(30, 41, 59, 0.65)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  padding: '14px',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                {/* Card Top: Category, Session & Date */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: 700,
                      backgroundColor: `${folderColor}22`,
                      color: folderColor,
                      border: `1px solid ${folderColor}44`,
                      textTransform: 'uppercase'
                    }}>
                      {folderName}
                    </span>

                    {test.session && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '10px',
                        color: test.session === 'morning' ? '#fbbf24' : '#a5b4fc',
                        fontWeight: 600
                      }}>
                        {test.session === 'morning' ? <Sun size={11} /> : <Sunset size={11} />}
                        <span style={{ textTransform: 'capitalize' }}>{test.session}</span>
                      </span>
                    )}
                  </div>

                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{test.date}</span>
                </div>

                {/* Exam Title */}
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#f8fafc',
                  margin: '0 0 10px 0',
                  lineHeight: 1.35
                }}>
                  {test.title}
                </h3>

                {/* Card Metrics Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '22px', fontWeight: 900, color: '#34d399', letterSpacing: '-0.5px' }}>
                      {test.marks}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>/ {test.totalMarks}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: 'rgba(52, 211, 153, 0.1)',
                      color: '#34d399',
                      border: '1px solid rgba(52, 211, 153, 0.2)'
                    }}>
                      {test.accuracy} Acc
                    </span>

                    {test.difficulty && (
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: 'rgba(245, 158, 11, 0.1)',
                        color: '#fbbf24',
                        border: '1px solid rgba(245, 158, 11, 0.2)'
                      }}>
                        Diff: {test.difficulty}
                      </span>
                    )}

                    <ChevronRight size={16} style={{ color: '#64748b' }} />
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

    </div>
  );
}
