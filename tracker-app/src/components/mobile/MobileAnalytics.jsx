import React, { useState, useMemo } from 'react';
import { 
  AreaChart, Area, LineChart, Line, BarChart, Bar, 
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend 
} from 'recharts';
import { 
  TrendingUp, Award, Target, CheckCircle2, 
  BarChart3, PieChart, Calendar, ChevronRight 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function MobileAnalytics({ tests = [], folders = [], onSelectTest }) {
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [activeMetricTab, setActiveMetricTab] = useState('score'); // 'score' | 'accuracy' | 'attempt'

  // Filter tests by selected folder
  const activeTests = useMemo(() => {
    if (!selectedFolderId) return tests;
    return tests.filter(t => t.folderId === selectedFolderId);
  }, [tests, selectedFolderId]);

  // Timeline chart data sorted chronologically
  const timelineData = useMemo(() => {
    const sorted = [...activeTests].sort((a, b) => new Date(a.date) - new Date(b.date));
    return sorted.map((t, idx) => {
      const yearMatch = t.title.match(/\b(19|20)\d{2}\b/);
      const setMatch = t.title.match(/(?:set|shift|session)\s*([1-3])/i);
      let shortLabel = yearMatch ? yearMatch[0].slice(2) : `#${idx + 1}`;
      if (yearMatch && setMatch) {
        shortLabel = `${yearMatch[0].slice(2)} S${setMatch[1]}`;
      }

      return {
        id: t.id,
        rawTest: t,
        name: shortLabel,
        title: t.title,
        date: t.date,
        marks: t.marks,
        accuracy: parseInt(t.accuracy) || 0,
        attemptRate: t.attemptRateVal || (t.totalQs > 0 ? Math.round((t.attempted / t.totalQs) * 100) : 0),
        attempted: t.attempted,
        correct: t.correct,
        incorrect: t.incorrect,
        difficulty: t.difficulty || null
      };
    });
  }, [activeTests]);

  // Category Comparison Data
  const categoryComparisonData = useMemo(() => {
    return folders.map(f => {
      const fTests = tests.filter(t => t.folderId === f.id);
      const count = fTests.length;
      const totalMarks = fTests.reduce((acc, t) => acc + (t.marks || 0), 0);
      const totalAccuracy = fTests.reduce((acc, t) => acc + (parseInt(t.accuracy) || 0), 0);

      return {
        name: f.name,
        color: f.color || '#6366f1',
        avgMarks: count > 0 ? parseFloat((totalMarks / count).toFixed(2)) : 0,
        avgAccuracy: count > 0 ? Math.round(totalAccuracy / count) : 0,
        count
      };
    }).filter(item => item.count > 0);
  }, [folders, tests]);

  // Question aggregate distribution
  const questionTotals = useMemo(() => {
    return activeTests.reduce((acc, t) => {
      acc.correct += (t.correct || 0);
      acc.incorrect += (t.incorrect || 0);
      acc.notAttempted += (t.notAttempted || 0);
      return acc;
    }, { correct: 0, incorrect: 0, notAttempted: 0 });
  }, [activeTests]);

  const totalAllQuestions = questionTotals.correct + questionTotals.incorrect + questionTotals.notAttempted;

  // Custom mobile tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          borderRadius: '12px',
          padding: '10px 12px',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.6)'
        }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>{d.date}</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', marginBottom: '6px', maxWidth: '180px' }}>
            {d.title}
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: payload[0].color || '#34d399' }}>
            {payload[0].name}: {payload[0].value}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ padding: '16px 16px 85px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Title & Filter */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: '#f8fafc' }}>
          Performance Analytics
        </h2>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
          Visual insights across {activeTests.length} tests
        </span>
      </div>

      {/* Category Filter Chips */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '4px',
        scrollbarWidth: 'none'
      }}>
        <button
          onClick={() => setSelectedFolderId(null)}
          style={{
            padding: '6px 14px',
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
              padding: '6px 14px',
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

      {/* 1. PRIMARY PROGRESSION CHART WITH METRIC TABS */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.65)',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '16px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Metric Selector Tabs */}
        <div style={{
          display: 'flex',
          background: 'rgba(15, 23, 42, 0.7)',
          borderRadius: '12px',
          padding: '3px',
          marginBottom: '16px'
        }}>
          {[
            { id: 'score', label: 'Score' },
            { id: 'accuracy', label: 'Accuracy %' },
            { id: 'attempt', label: 'Attempt Rate %' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveMetricTab(tab.id)}
              style={{
                flex: 1,
                padding: '7px 4px',
                borderRadius: '9px',
                border: 'none',
                background: activeMetricTab === tab.id ? '#6366f1' : 'transparent',
                color: activeMetricTab === tab.id ? '#ffffff' : '#94a3b8',
                fontSize: '11px',
                fontWeight: activeMetricTab === tab.id ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Chart Canvas */}
        <div style={{ width: '100%', height: '220px' }}>
          <ResponsiveContainer width="100%" height="100%">
            {activeMetricTab === 'score' ? (
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="mobileScoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="marks" 
                  name="Score" 
                  stroke="#10b981" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#mobileScoreGrad)" 
                />
              </AreaChart>
            ) : activeMetricTab === 'accuracy' ? (
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="mobileAccGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="accuracy" 
                  name="Accuracy %" 
                  stroke="#3b82f6" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#mobileAccGrad)" 
                />
              </AreaChart>
            ) : (
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="mobileAttGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="attemptRate" 
                  name="Attempt %" 
                  stroke="#f59e0b" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#mobileAttGrad)" 
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. CATEGORY COMPARISON BARS */}
      {categoryComparisonData.length > 1 && (
        <div style={{
          background: 'rgba(30, 41, 59, 0.65)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <BarChart3 size={16} style={{ color: '#818cf8' }} />
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Category Average Comparison
            </h4>
          </div>

          <div style={{ width: '100%', height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryComparisonData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip 
                  formatter={(val, name) => [val, name === 'avgMarks' ? 'Avg Score' : 'Avg Acc %']}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}
                />
                <Bar dataKey="avgMarks" name="Avg Score" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgAccuracy" name="Avg Acc %" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 3. QUESTION BREAKDOWN VISUAL (Correct / Incorrect / Unattempted) */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.65)',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <PieChart size={16} style={{ color: '#34d399' }} />
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            Question Accuracy Distribution ({totalAllQuestions} Qs)
          </h4>
        </div>

        {/* Stacked Bar Distribution */}
        {totalAllQuestions > 0 && (
          <div style={{
            display: 'flex',
            height: '14px',
            borderRadius: '7px',
            overflow: 'hidden',
            marginBottom: '14px'
          }}>
            <div 
              style={{ 
                width: `${(questionTotals.correct / totalAllQuestions) * 100}%`, 
                backgroundColor: '#10b981' 
              }} 
              title="Correct" 
            />
            <div 
              style={{ 
                width: `${(questionTotals.incorrect / totalAllQuestions) * 100}%`, 
                backgroundColor: '#ef4444' 
              }} 
              title="Incorrect" 
            />
            <div 
              style={{ 
                width: `${(questionTotals.notAttempted / totalAllQuestions) * 100}%`, 
                backgroundColor: '#64748b' 
              }} 
              title="Unattempted" 
            />
          </div>
        )}

        {/* Legend stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '10px' }}>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#34d399' }}>{questionTotals.correct}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Correct</div>
          </div>
          <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '10px' }}>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#f87171' }}>{questionTotals.incorrect}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Incorrect</div>
          </div>
          <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(148, 163, 184, 0.08)', borderRadius: '10px' }}>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#cbd5e1' }}>{questionTotals.notAttempted}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Unattempted</div>
          </div>
        </div>
      </div>

      {/* 4. RECENT PERFORMANCE TIMELINE LIST */}
      <div>
        <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', margin: '0 0 10px 0' }}>
          Recent Timeline
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {timelineData.slice(-5).reverse().map((item, idx) => (
            <div
              key={idx}
              onClick={() => onSelectTest && onSelectTest(item.rawTest)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '14px',
                backgroundColor: 'rgba(30, 41, 59, 0.45)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                cursor: 'pointer'
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                  {item.title}
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{item.date}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#34d399' }}>
                  {item.marks}
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
