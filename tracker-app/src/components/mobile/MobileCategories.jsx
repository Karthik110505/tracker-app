import React, { useState } from 'react';
import { 
  FolderTree, Award, TrendingUp, CheckCircle, 
  Calendar, ChevronRight, ArrowLeft, BookOpen 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

export default function MobileCategories({ folders = [], tests = [], onSelectTest, onNavigateTab }) {
  const [selectedFolder, setSelectedFolder] = useState(null);

  // If a folder is opened, show its deep-dive view
  if (selectedFolder) {
    const categoryTests = tests
      .filter(t => t.folderId === selectedFolder.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalTests = categoryTests.length;
    const avgMarks = totalTests > 0 
      ? (categoryTests.reduce((acc, t) => acc + (t.marks || 0), 0) / totalTests).toFixed(2)
      : '0.00';
    const bestMarks = totalTests > 0 
      ? Math.max(...categoryTests.map(t => t.marks || 0)).toFixed(2)
      : '0.00';
    const avgAccuracy = totalTests > 0
      ? Math.round(categoryTests.reduce((acc, t) => acc + (parseInt(t.accuracy) || 0), 0) / totalTests)
      : 0;

    const chartData = [...categoryTests]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((t, idx) => ({
        name: `#${idx + 1}`,
        marks: t.marks,
        title: t.title
      }));

    return (
      <div style={{ padding: '16px 16px 85px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Back navigation */}
        <button
          onClick={() => setSelectedFolder(null)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: '#a5b4fc',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0
          }}
        >
          <ArrowLeft size={16} />
          <span>All Categories</span>
        </button>

        {/* Category Banner */}
        <div style={{
          background: `linear-gradient(135deg, ${selectedFolder.color || '#6366f1'}22, rgba(15, 23, 42, 0.8))`,
          borderRadius: '20px',
          border: `1px solid ${selectedFolder.color || '#6366f1'}44`,
          padding: '20px 16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: selectedFolder.color || '#6366f1'
            }} />
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              {selectedFolder.name}
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '16px' }}>
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '8px' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>{totalTests}</div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>Tests</div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '8px' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#34d399' }}>{avgMarks}</div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>Avg Score</div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '8px' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#60a5fa' }}>{bestMarks}</div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>Best Score</div>
            </div>
          </div>
        </div>

        {/* Mini Progression Chart */}
        {chartData.length > 1 && (
          <div style={{
            background: 'rgba(30, 41, 59, 0.65)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '14px'
          }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', margin: '0 0 10px 0' }}>
              Performance Curve
            </h4>
            <div style={{ width: '100%', height: '140px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} tickLine={false} />
                  <Area 
                    type="monotone" 
                    dataKey="marks" 
                    stroke={selectedFolder.color || '#6366f1'} 
                    fill={`${selectedFolder.color || '#6366f1'}33`} 
                    strokeWidth={2} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tests List inside category */}
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', margin: '0 0 10px 0' }}>
            Logged Papers ({categoryTests.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {categoryTests.map(test => (
              <div
                key={test.id}
                onClick={() => onSelectTest && onSelectTest(test)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                    {test.title}
                  </div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{test.date}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#34d399' }}>
                    {test.marks}
                  </span>
                  <ChevronRight size={14} style={{ color: '#64748b' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Categories list overview
  return (
    <div style={{ padding: '16px 16px 85px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: '#f8fafc' }}>
          Study Categories
        </h2>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
          Organized folders and revision topics
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {folders.map(folder => {
          const catTests = tests.filter(t => t.folderId === folder.id);
          const count = catTests.length;
          const avgMarks = count > 0 
            ? (catTests.reduce((acc, t) => acc + (t.marks || 0), 0) / count).toFixed(1)
            : '0.0';
          const bestMarks = count > 0 
            ? Math.max(...catTests.map(t => t.marks || 0)).toFixed(1)
            : '0.0';

          return (
            <motion.div
              key={folder.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedFolder(folder)}
              style={{
                background: 'rgba(30, 41, 59, 0.65)',
                backdropFilter: 'blur(10px)',
                borderRadius: '18px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '16px',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: folder.color || '#6366f1'
                  }} />
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    {folder.name}
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#818cf8', fontSize: '12px', fontWeight: 600 }}>
                  <span>Explore</span>
                  <ChevronRight size={14} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>{count}</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Tests Logged</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#34d399' }}>{avgMarks}</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Avg Marks</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#60a5fa' }}>{bestMarks}</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Best Score</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
