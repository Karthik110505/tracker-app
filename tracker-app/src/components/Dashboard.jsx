import React, { useState, useEffect, useMemo, memo } from 'react';
import { 
  ResponsiveContainer, ComposedChart, Area, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { Calendar, Award, CheckCircle, Clock } from 'lucide-react';

/**
 * Isolated Countdown Timer Component
 * Self-contained 1-second interval ensures ticks NEVER trigger re-renders
 * of the parent Dashboard or its expensive charts.
 */
const CountdownTimer = memo(function CountdownTimer() {
  const targetDate = useMemo(() => new Date('2027-02-06T09:00:00').getTime(), []);
  
  const calculateTimeLeft = React.useCallback(() => {
    const difference = targetDate - Date.now();
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60)
    };
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  return (
    <div className="glass-card countdown-card">
      <div className="countdown-info">
        <h3>GATE 2027 Timer</h3>
        <p>Time remaining until the GATE 2027 exam</p>
      </div>
      <div className="countdown-digits">
        <div className="countdown-block">
          <span className="countdown-number">{timeLeft.days}</span>
          <span className="countdown-label">Days</span>
        </div>
        <div className="countdown-block">
          <span className="countdown-number">{timeLeft.hours.toString().padStart(2, '0')}</span>
          <span className="countdown-label">Hrs</span>
        </div>
        <div className="countdown-block">
          <span className="countdown-number">{timeLeft.minutes.toString().padStart(2, '0')}</span>
          <span className="countdown-label">Min</span>
        </div>
        <div className="countdown-block">
          <span className="countdown-number">{timeLeft.seconds.toString().padStart(2, '0')}</span>
          <span className="countdown-label">Sec</span>
        </div>
      </div>
    </div>
  );
});

/**
 * Rich Custom HUD Tooltip for Progression Charts
 */
function CustomProgressionTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const testData = payload[0]?.payload || {};

  return (
    <div style={{
      backgroundColor: 'rgba(13, 17, 39, 0.95)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '10px',
      padding: '12px 16px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(12px)',
      color: '#f8fafc',
      fontSize: '13px',
      minWidth: '220px'
    }}>
      <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '2px', color: '#ffffff' }}>
        {testData.fullTitle || label}
      </div>
      {testData.date && (
        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>
          Date: {testData.date}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px' }}>
        {payload.map((entry) => (
          <div key={entry.dataKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}>
              <span style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                backgroundColor: entry.color || entry.stroke, 
                display: 'inline-block' 
              }} />
              {entry.name}:
            </span>
            <span style={{ fontWeight: '700', color: entry.color || entry.stroke }}>
              {entry.value}{entry.dataKey === 'accuracy' ? '%' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ folderName, tests = [], folders = [], isGeneral }) {
  // Interactive Metric Visibility Toggles
  const [activeMetrics, setActiveMetrics] = useState({
    marks: true,
    accuracy: true,
    attempted: false,
    penalty: false
  });

  const toggleMetric = (key) => {
    setActiveMetrics(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Compute Overall KPI Stats (Memoized to prevent recalculations)
  const { totalTests, avgMarks, avgAccuracy, attemptRate } = useMemo(() => {
    const count = tests.length;
    if (count === 0) {
      return { totalTests: 0, avgMarks: '0.00', avgAccuracy: 0, attemptRate: 0 };
    }

    const marksSum = tests.reduce((acc, t) => acc + (t.marks || 0), 0);
    const accuracySum = tests.reduce((acc, t) => acc + (parseInt(t.accuracy) || 0), 0);
    const attemptedSum = tests.reduce((acc, t) => acc + (t.attempted || 0), 0);
    const questionsSum = tests.reduce((acc, t) => acc + (t.totalQs || 0), 0);

    return {
      totalTests: count,
      avgMarks: (marksSum / count).toFixed(2),
      avgAccuracy: Math.round(accuracySum / count),
      attemptRate: questionsSum > 0 ? Math.round((attemptedSum / questionsSum) * 100) : 0
    };
  }, [tests]);

  // High-Performance Timeline Data (Instantaneous Arithmetic - 0ms DOMParser overhead!)
  const timelineData = useMemo(() => {
    const sorted = [...tests].sort((a, b) => new Date(a.date) - new Date(b.date));

    return sorted.map((t, idx) => {
      const yearMatch = t.title ? t.title.match(/\b(19|20)\d{2}\b/) : null;
      const shortName = yearMatch ? yearMatch[0] : `T${idx + 1}`;

      const correctVal = t.correct || 0;
      const incorrectVal = t.incorrect || 0;
      const marksVal = t.marks || 0;

      let penalty = t.penaltyMarks !== undefined ? t.penaltyMarks : (t.penalty !== undefined ? t.penalty : 0);
      let awardedMarks = t.awardedMarks !== undefined ? t.awardedMarks : 0;

      if (!penalty && !awardedMarks) {
        const denominator = correctVal - (incorrectVal / 3);
        if (denominator > 0) {
          const w = marksVal / denominator;
          awardedMarks = parseFloat((correctVal * w).toFixed(2));
          penalty = parseFloat(((incorrectVal * w) / 3).toFixed(2));
        } else {
          awardedMarks = marksVal;
          penalty = 0;
        }
      }

      return {
        name: shortName,
        fullTitle: t.title,
        date: t.date,
        marks: parseFloat(marksVal.toFixed(2)),
        accuracy: parseInt(t.accuracy) || 0,
        attempted: t.attempted || 0,
        awardedMarks: parseFloat(awardedMarks.toFixed(2)),
        penalty: parseFloat(penalty.toFixed(2))
      };
    });
  }, [tests]);

  // Compile Category Comparison Data (General Dashboard only)
  const categoryComparisonData = useMemo(() => {
    if (!isGeneral || !folders || folders.length === 0) return [];

    const folderStats = {};
    folders.forEach(f => {
      folderStats[f.id] = {
        name: f.name,
        totalMarks: 0,
        count: 0,
        totalAccuracy: 0
      };
    });

    tests.forEach(t => {
      if (folderStats[t.folderId]) {
        folderStats[t.folderId].totalMarks += (t.marks || 0);
        folderStats[t.folderId].totalAccuracy += (parseInt(t.accuracy) || 0);
        folderStats[t.folderId].count++;
      }
    });

    return Object.keys(folderStats).map(key => {
      const stats = folderStats[key];
      return {
        name: stats.name,
        'Avg Marks': stats.count > 0 ? parseFloat((stats.totalMarks / stats.count).toFixed(2)) : 0,
        'Avg Accuracy %': stats.count > 0 ? Math.round(stats.totalAccuracy / stats.count) : 0,
        'Tests Logged': stats.count
      };
    });
  }, [isGeneral, folders, tests]);

  // Helper renderer for Progression ComposedChart
  const renderProgressionChart = (title, subtitle) => (
    <div className="glass-card full-width-chart-card">
      <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div className="chart-title">
          <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>{title}</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>{subtitle}</p>
        </div>

        {/* Interactive Metric Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            type="button"
            onClick={() => toggleMetric('marks')}
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              border: '1px solid',
              borderColor: activeMetrics.marks ? '#3b82f6' : 'rgba(255,255,255,0.1)',
              backgroundColor: activeMetrics.marks ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
              color: activeMetrics.marks ? '#60a5fa' : '#94a3b8',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
            Marks Obtained
          </button>
          <button 
            type="button"
            onClick={() => toggleMetric('accuracy')}
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              border: '1px solid',
              borderColor: activeMetrics.accuracy ? '#8b5cf6' : 'rgba(255,255,255,0.1)',
              backgroundColor: activeMetrics.accuracy ? 'rgba(139, 92, 246, 0.18)' : 'transparent',
              color: activeMetrics.accuracy ? '#a78bfa' : '#94a3b8',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#8b5cf6' }} />
            Accuracy %
          </button>
          <button 
            type="button"
            onClick={() => toggleMetric('attempted')}
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              border: '1px solid',
              borderColor: activeMetrics.attempted ? '#f59e0b' : 'rgba(255,255,255,0.1)',
              backgroundColor: activeMetrics.attempted ? 'rgba(245, 158, 11, 0.18)' : 'transparent',
              color: activeMetrics.attempted ? '#fbbf24' : '#94a3b8',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
            Attempts
          </button>
          <button 
            type="button"
            onClick={() => toggleMetric('penalty')}
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              border: '1px solid',
              borderColor: activeMetrics.penalty ? '#ef4444' : 'rgba(255,255,255,0.1)',
              backgroundColor: activeMetrics.penalty ? 'rgba(239, 68, 68, 0.18)' : 'transparent',
              color: activeMetrics.penalty ? '#f87171' : '#94a3b8',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
            Penalty
          </button>
        </div>
      </div>
      
      <div style={{ width: '100%', height: 320, marginTop: '16px' }}>
        {timelineData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <ComposedChart data={timelineData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMarksGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
              <XAxis 
                dataKey="name" 
                stroke="#94a3b8" 
                fontSize={12} 
                tickLine={false} 
              />
              <YAxis 
                domain={[0, 100]} 
                stroke="#94a3b8" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <Tooltip content={<CustomProgressionTooltip />} />
              <Legend verticalAlign="top" height={36} />

              {/* Marks Obtained: Hero Area */}
              {activeMetrics.marks && (
                <Area 
                  type="monotone" 
                  dataKey="marks" 
                  name="Marks Obtained" 
                  stroke="#3b82f6" 
                  strokeWidth={2.5} 
                  fill="url(#colorMarksGrad)" 
                  dot={{ r: 3, fill: '#3b82f6' }}
                  activeDot={{ r: 6, fill: '#60a5fa' }}
                  isAnimationActive={false}
                />
              )}

              {/* Accuracy %: Crisp Line */}
              {activeMetrics.accuracy && (
                <Line 
                  type="monotone" 
                  dataKey="accuracy" 
                  name="Accuracy %" 
                  stroke="#8b5cf6" 
                  strokeWidth={2} 
                  dot={{ r: 3, fill: '#8b5cf6' }}
                  activeDot={{ r: 6, fill: '#a78bfa' }}
                  isAnimationActive={false}
                />
              )}

              {/* Questions Attempted: Amber Dashed Line */}
              {activeMetrics.attempted && (
                <Line 
                  type="monotone" 
                  dataKey="attempted" 
                  name="Questions Attempted" 
                  stroke="#f59e0b" 
                  strokeWidth={1.5} 
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#f59e0b' }}
                  activeDot={{ r: 5, fill: '#fbbf24' }}
                  isAnimationActive={false}
                />
              )}

              {/* Penalty Marks: Ruby Red Dotted Line */}
              {activeMetrics.penalty && (
                <Line 
                  type="monotone" 
                  dataKey="penalty" 
                  name="Penalty Marks" 
                  stroke="#ef4444" 
                  strokeWidth={1.5} 
                  strokeDasharray="3 3"
                  dot={{ r: 3, fill: '#ef4444' }}
                  activeDot={{ r: 5, fill: '#f87171' }}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)', fontSize: '14px' }}>
            No performance data available. Log tests under this category to plot graphs.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Section: Welcome & Isolated Countdown */}
      <div className="welcome-countdown-grid">
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '6px' }}>
            {isGeneral ? 'General Revision Tracker' : 'GATE 2027 Dashboard'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Active Category: <strong style={{ color: 'var(--color-primary)' }}>{folderName || 'General Dashboard'}</strong>
          </p>
          <p style={{ color: 'var(--text-dark)', fontSize: '12px', marginTop: '12px' }}>
            {isGeneral 
              ? 'Aggregated summary of your performance across all folders. Compare categories side-by-side below.'
              : 'Practice like a real mock environment. Drag your offline HTML result papers into the logger to populate metrics instantly.'}
          </p>
        </div>

        {/* Self-contained Countdown Timer */}
        <CountdownTimer />
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary)' }}>
            <Calendar size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalTests}</span>
            <span className="stat-label">Total Tests Logged</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--color-secondary)' }}>
            <Award size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{avgMarks}</span>
            <span className="stat-label">Overall Average Score</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
            <CheckCircle size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{avgAccuracy}%</span>
            <span className="stat-label">Overall Avg Accuracy</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}>
            <Clock size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{attemptRate}%</span>
            <span className="stat-label">Overall Attempt Rate</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="charts-grid">
        {isGeneral ? (
          <>
            {/* Category Comparison Bar Chart */}
            <div className="glass-card">
              <div className="chart-header">
                <div className="chart-title">
                  <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Category Performance Comparison</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Comparing scores and accuracy across different classes / folders</p>
                </div>
              </div>
              <div style={{ width: '100%', height: 300, marginTop: '16px' }}>
                {tests.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={categoryComparisonData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(13, 17, 39, 0.95)', 
                          borderColor: 'rgba(255, 255, 255, 0.15)',
                          borderRadius: '10px',
                          color: '#f8fafc' 
                        }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="Avg Marks" fill="#3b82f6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                      <Bar dataKey="Avg Accuracy %" fill="#8b5cf6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)', fontSize: '14px' }}>
                    No test data logged to compare categories.
                  </div>
                )}
              </div>
            </div>

            {/* Overall Progression Timeline (General Dashboard) */}
            {renderProgressionChart(
              'Overall Study Progression',
              'Timeline of test scores, accuracy, and performance over time'
            )}
          </>
        ) : (
          /* Scoped Category Chart */
          renderProgressionChart(
            'Performance Progression',
            'Graph showing marks, accuracy, and test progression'
          )
        )}
      </div>

    </div>
  );
}
