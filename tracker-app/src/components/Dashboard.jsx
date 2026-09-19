import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Legend 
} from 'recharts';
import { Calendar, Award, CheckCircle, Clock } from 'lucide-react';
import { calculateExamDetails, getDifficultyRating } from '../utils/htmlParser';
import { motion } from 'framer-motion';

export default function Dashboard({ folderName, folderId, tests, folders, isGeneral }) {
  // GATE 2027 Countdown Target: Feb 6, 2027 09:00:00
  const targetDate = new Date('2027-02-06T09:00:00').getTime();
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  
  // Persist series visibility state per subject/folder
  const [visibleSeries, setVisibleSeries] = useState({
    marks: true,
    awardedMarks: true,
    penalty: true,
    accuracy: true,
    attempted: true,
    difficulty: true
  });

  useEffect(() => {
    const key = `dashboard_visible_series_${folderId || 'general'}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setVisibleSeries(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved visible series', e);
      }
    } else {
      setVisibleSeries({
        marks: true,
        awardedMarks: true,
        penalty: true,
        accuracy: true,
        attempted: true,
        difficulty: true
      });
    }
  }, [folderId]);

  const handleToggleSeries = (seriesKey) => {
    setVisibleSeries(prev => {
      const next = { ...prev, [seriesKey]: !prev[seriesKey] };
      const key = `dashboard_visible_series_${folderId || 'general'}`;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  };

  // State to filter by year
  const [selectedYears, setSelectedYears] = useState({});

  // Extract all unique years from the unfiltered tests
  const uniqueYears = React.useMemo(() => {
    const years = tests.map(t => {
      const yearMatch = t.title.match(/\b(19|20)\d{2}\b/);
      return yearMatch ? yearMatch[0] : 'Unknown';
    });
    return Array.from(new Set(years)).sort((a, b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return b - a; // Descending
    });
  }, [tests]);

  // Sync selected years state with localStorage
  useEffect(() => {
    const yearsKey = `dashboard_selected_years_${folderId || 'general'}`;
    const savedYears = localStorage.getItem(yearsKey);
    let parsedYears = {};
    
    if (savedYears) {
      try {
        parsedYears = JSON.parse(savedYears);
      } catch (e) {
        console.error('Failed to parse saved years', e);
      }
    }
    
    const newYears = {};
    uniqueYears.forEach(y => {
      newYears[y] = parsedYears[y] !== undefined ? parsedYears[y] : true;
    });
    
    setSelectedYears(newYears);
  }, [folderId, uniqueYears]);

  const handleToggleYear = (year) => {
    setSelectedYears(prev => {
      const next = { ...prev, [year]: !prev[year] };
      const yearsKey = `dashboard_selected_years_${folderId || 'general'}`;
      localStorage.setItem(yearsKey, JSON.stringify(next));
      return next;
    });
  };


  // State to filter folders shown in the category comparison bar chart
  const [selectedComparisonFolders, setSelectedComparisonFolders] = useState({});

  const isFolderSelected = (fId) => {
    return selectedComparisonFolders[fId] !== false;
  };

  const handleToggleFolderComparison = (fId) => {
    setSelectedComparisonFolders(prev => ({
      ...prev,
      [fId]: !isFolderSelected(fId)
    }));
  };

  function calculateTimeLeft() {
    const now = new Date().getTime();
    const difference = targetDate - now;
    
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60)
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filtered tests based on year
  const displayingTests = React.useMemo(() => {
    return tests.filter(t => {
      const yearMatch = t.title.match(/\b(19|20)\d{2}\b/);
      const year = yearMatch ? yearMatch[0] : 'Unknown';
      const isYearSelected = selectedYears[year] !== false;
      return isYearSelected;
    });
  }, [tests, selectedYears]);

  // Compute overall stats
  const { totalTests, avgMarks, avgAccuracy, attemptRate } = React.useMemo(() => {
    const totalTests = displayingTests.length;
    
    const avgMarks = totalTests > 0 
      ? (displayingTests.reduce((acc, t) => acc + t.marks, 0) / totalTests).toFixed(2)
      : '0.00';
      
    const avgAccuracy = totalTests > 0
      ? Math.round(displayingTests.reduce((acc, t) => {
          const accNum = parseInt(t.accuracy) || 0;
          return acc + accNum;
        }, 0) / totalTests)
      : 0;

    const totalAttempted = displayingTests.reduce((acc, t) => acc + t.attempted, 0);
    const totalQuestions = displayingTests.reduce((acc, t) => acc + t.totalQs, 0);
    const attemptRate = totalQuestions > 0
      ? Math.round((totalAttempted / totalQuestions) * 100)
      : 0;

    return { totalTests, avgMarks, avgAccuracy, attemptRate };
  }, [displayingTests]);

  // Prepare overall timeline chart data
  const timelineData = React.useMemo(() => {
    const sortedTests = [...displayingTests].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return sortedTests.map((t, idx) => {
      const yearMatch = t.title.match(/\b(19|20)\d{2}\b/);
      const setMatch = t.title.match(/(?:set|shift|session)\s*([1-3])/i);
      let shortName = yearMatch ? yearMatch[0] : `T${idx + 1}`;
      if (yearMatch && setMatch) {
        shortName = `${yearMatch[0]} S${setMatch[1]}`;
      }
      
      let penalty = 0;
      let awardedMarks = 0;
      
      if (t.paperHtml) {
        const details = calculateExamDetails(t.paperHtml);
        if (details && details.success) {
          penalty = details.summary.penaltyMarks;
          awardedMarks = details.summary.awardedMarks;
        }
      }
      
      if (penalty === 0 && awardedMarks === 0) {
        // Fallback approximation for manually logged tests
        const correctVal = t.correct || 0;
        const incorrectVal = t.incorrect || 0;
        const marksVal = t.marks || 0;
        const denominator = correctVal - (incorrectVal / 3);
        if (denominator > 0) {
          const w = marksVal / denominator;
          awardedMarks = parseFloat((correctVal * w).toFixed(2));
          penalty = parseFloat((incorrectVal * w / 3).toFixed(2));
        } else {
          awardedMarks = marksVal;
          penalty = 0;
        }
      }
      
      let difficulty = t.difficulty;
      if (difficulty === undefined || difficulty === null) {
        difficulty = getDifficultyRating(t.title);
      }
      
      return {
        id: t.id,
        name: shortName,
        fullTitle: t.title,
        marks: t.marks,
        accuracy: parseInt(t.accuracy) || 0,
        attempted: t.attempted,
        awardedMarks,
        penalty,
        difficulty
      };
    });
  }, [displayingTests]);

  const hasDifficultyData = React.useMemo(() => {
    return timelineData.some(d => d.difficulty !== undefined && d.difficulty !== null);
  }, [timelineData]);

  // Compile Category Comparison Data (General Dashboard only)
  const categoryComparisonData = React.useMemo(() => {
    let compData = [];
    if (isGeneral && folders && folders.length > 0) {
      const folderStats = {};
      
      folders.forEach(f => {
        folderStats[f.id] = {
          name: f.name,
          totalMarks: 0,
          count: 0,
          totalAccuracy: 0
        };
      });

      displayingTests.forEach(t => {
        if (folderStats[t.folderId]) {
          folderStats[t.folderId].totalMarks += t.marks;
          folderStats[t.folderId].totalAccuracy += (parseInt(t.accuracy) || 0);
          folderStats[t.folderId].count++;
        }
      });

      compData = Object.keys(folderStats)
        .filter(id => isFolderSelected(id))
        .map(key => {
          const stats = folderStats[key];
          return {
            name: stats.name,
            'Avg Marks': stats.count > 0 ? parseFloat((stats.totalMarks / stats.count).toFixed(2)) : 0,
            'Avg Accuracy %': stats.count > 0 ? Math.round(stats.totalAccuracy / stats.count) : 0,
            'Tests Logged': stats.count
          };
        });
    }
    return compData;
  }, [isGeneral, folders, displayingTests, selectedComparisonFolders]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
    >
      
      {/* Top Section: Welcome & Countdown */}
      <div className="welcome-countdown-grid">
        <div className={`glass-card welcome-card ${isGeneral ? 'general-welcome-card' : ''}`}>
          <div className="welcome-info">
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
          {isGeneral && (
            <div className="general-total-tests-stat">
              <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary)' }}>
                <Calendar size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{totalTests}</span>
                <span className="stat-label">Total Tests Logged</span>
              </div>
            </div>
          )}
        </div>

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
      </div>

      {/* KPI Stats Grid - only shown for specific categories */}
      {!isGeneral && (
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
      )}

      {/* Analytics Charts Grid */}
      <div className="charts-grid">
        {isGeneral ? (
          /* Category Comparison Bar Chart */
          <div className="glass-card">
            <div className="chart-header">
              <div className="chart-title">
                <h3>Category Performance Comparison</h3>
                <p>Comparing scores and accuracy across different classes / folders</p>
              </div>
            </div>

            {/* Category Selector Checkboxes */}
            {folders && folders.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', flexWrap: 'wrap', marginBottom: '12px', padding: '12px 16px', background: 'rgba(3, 5, 11, 0.3)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '6px' }}>
                  Filter Categories:
                </span>
                {folders.map(f => {
                  const isSelected = isFolderSelected(f.id);
                  return (
                    <label 
                      key={f.id} 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '12px', 
                        cursor: 'pointer', 
                        color: isSelected ? 'var(--text-main)' : 'var(--text-muted)', 
                        userSelect: 'none',
                        background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        border: isSelected ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '20px',
                        padding: '5px 12px',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        fontWeight: isSelected ? '600' : '400'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={() => handleToggleFolderComparison(f.id)}
                        style={{ display: 'none' }}
                      />
                      <span>{f.name}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Year Selector Checkboxes */}
            {uniqueYears.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', flexWrap: 'wrap', marginBottom: '24px', padding: '12px 16px', background: 'rgba(3, 5, 11, 0.3)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '6px' }}>
                  Filter Years:
                </span>
                {uniqueYears.map(year => {
                  const isSelected = selectedYears[year] !== false;
                  return (
                    <label 
                      key={year} 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '12px', 
                        cursor: 'pointer', 
                        color: isSelected ? 'var(--text-main)' : 'var(--text-muted)', 
                        userSelect: 'none',
                        background: isSelected ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        border: isSelected ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '20px',
                        padding: '5px 12px',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        fontWeight: isSelected ? '600' : '400'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={() => handleToggleYear(year)}
                        style={{ display: 'none' }}
                      />
                      <span>{year}</span>
                    </label>
                  );
                })}
              </div>
            )}

            <div style={{ width: '100%', height: 300 }}>
              {tests.length > 0 ? (
                categoryComparisonData.length > 0 ? (
                  <ResponsiveContainer>
                    <BarChart data={categoryComparisonData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0d1127', 
                          borderColor: 'rgba(255, 255, 255, 0.08)',
                          borderRadius: '12px',
                          color: 'var(--text-main)',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                        }}
                        cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="Avg Marks" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Avg Accuracy %" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)', fontSize: '14px' }}>
                    Select at least one category to view comparison.
                  </div>
                )
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)', fontSize: '14px' }}>
                  No test data logged to compare categories.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Scoped Category Chart */
          <div className="glass-card full-width-chart-card">
            <div className="chart-header">
              <div className="chart-title">
                <h3>Performance Progression</h3>
                <p>Graph showing marks yearwise / test-by-test</p>
              </div>
            </div>
            
            {tests.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', flexWrap: 'wrap', marginTop: '16px' }}>
                {/* Toggles Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '190px', padding: '16px', background: 'rgba(3, 5, 11, 0.4)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', alignSelf: 'flex-start' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Toggle Visibility</h4>
                  {[
                    { key: 'marks', name: 'Marks Obtained', color: 'var(--color-primary)' },
                    { key: 'awardedMarks', name: 'Marks Without Penalty', color: 'var(--color-success)' },
                    { key: 'penalty', name: 'Penalty', color: 'var(--color-danger)' },
                    { key: 'accuracy', name: 'Accuracy %', color: 'var(--color-secondary)' },
                    { key: 'attempted', name: 'Questions Attempted', color: 'var(--color-warning)' },
                    ...(hasDifficultyData ? [{ key: 'difficulty', name: 'Difficulty Rating', color: '#ec4899' }] : [])
                  ].map((s) => {
                    const isChecked = visibleSeries[s.key];
                    return (
                      <label 
                        key={s.key} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          fontSize: '12px', 
                          cursor: 'pointer', 
                          color: isChecked ? 'var(--text-main)' : 'var(--text-muted)', 
                          userSelect: 'none',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          background: isChecked ? 'rgba(255,255,255,0.03)' : 'transparent',
                          transition: 'all 0.2s ease',
                          border: isChecked ? '1px solid rgba(255,255,255,0.04)' : '1px solid transparent'
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => handleToggleSeries(s.key)}
                          style={{ accentColor: s.color, width: '14px', height: '14px', cursor: 'pointer' }}
                        />
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: s.color, boxShadow: isChecked ? `0 0 8px ${s.color}` : 'none' }} />
                        <span style={{ fontWeight: isChecked ? '600' : '400' }}>{s.name}</span>
                      </label>
                    );
                  })}

                  {/* Filter by Year */}
                  {uniqueYears.length > 0 && (
                    <>
                      <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.05)', margin: '12px 0' }} />
                      <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Filter by Year</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
                        {uniqueYears.map(year => {
                          const isChecked = selectedYears[year] !== false;
                          return (
                            <label 
                              key={year} 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                fontSize: '12px', 
                                cursor: 'pointer', 
                                color: isChecked ? 'var(--text-main)' : 'var(--text-muted)', 
                                userSelect: 'none',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                background: isChecked ? 'rgba(255,255,255,0.03)' : 'transparent',
                                transition: 'all 0.2s ease',
                                border: isChecked ? '1px solid rgba(255,255,255,0.04)' : '1px solid transparent'
                              }}
                            >
                              <input 
                                type="checkbox" 
                                checked={isChecked} 
                                onChange={() => handleToggleYear(year)}
                                style={{ accentColor: 'var(--color-primary)', width: '14px', height: '14px', cursor: 'pointer' }}
                              />
                              <span style={{ fontWeight: isChecked ? '600' : '400' }}>{year}</span>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  )}

                </div>
                
                {/* Chart Container */}
                <div style={{ flex: 1, height: 300, minWidth: '300px' }}>
                  {timelineData.length > 0 ? (
                    <ResponsiveContainer>
                      <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorMarks" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.0}/>
                          </linearGradient>
                          <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-secondary)" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="var(--color-secondary)" stopOpacity={0.0}/>
                          </linearGradient>
                          <linearGradient id="colorAwarded" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0.0}/>
                          </linearGradient>
                          <linearGradient id="colorPenalty" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-danger)" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="var(--color-danger)" stopOpacity={0.0}/>
                          </linearGradient>
                          <linearGradient id="colorAttempts" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-warning)" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="var(--color-warning)" stopOpacity={0.0}/>
                          </linearGradient>
                          <linearGradient id="colorDifficulty" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#ec4899" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis 
                          dataKey="id" 
                          tickFormatter={(id) => {
                            const item = timelineData.find(d => d.id === id);
                            return item ? item.name : '';
                          }} 
                          stroke="var(--text-muted)" 
                          fontSize={12} 
                          tickLine={false} 
                        />
                        <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#0d1127', 
                            borderColor: 'rgba(255, 255, 255, 0.08)',
                            borderRadius: '12px',
                            color: 'var(--text-main)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                          }}
                          labelFormatter={(label, payload) => payload && payload[0] ? payload[0].payload.fullTitle : label}
                        />
                        <Legend verticalAlign="top" height={36} />
                        {visibleSeries.marks && (
                          <Area type="monotone" dataKey="marks" name="Marks Obtained" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorMarks)" />
                        )}
                        {visibleSeries.awardedMarks && (
                          <Area type="monotone" dataKey="awardedMarks" name="Marks Without Penalty" stroke="var(--color-success)" strokeWidth={2} fillOpacity={1} fill="url(#colorAwarded)" />
                        )}
                        {visibleSeries.penalty && (
                          <Area type="monotone" dataKey="penalty" name="Penalty" stroke="var(--color-danger)" strokeWidth={2} fillOpacity={1} fill="url(#colorPenalty)" />
                        )}
                        {visibleSeries.accuracy && (
                          <Area type="monotone" dataKey="accuracy" name="Accuracy %" stroke="var(--color-secondary)" strokeWidth={1} fillOpacity={1} fill="url(#colorAccuracy)" />
                        )}
                        {visibleSeries.attempted && (
                          <Area type="monotone" dataKey="attempted" name="Questions Attempted" stroke="var(--color-warning)" strokeWidth={1.5} fillOpacity={1} fill="url(#colorAttempts)" />
                        )}
                        {hasDifficultyData && visibleSeries.difficulty && (
                          <Area type="monotone" dataKey="difficulty" name="Difficulty Rating" stroke="#ec4899" strokeWidth={2} fillOpacity={1} fill="url(#colorDifficulty)" />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)', fontSize: '14px' }}>
                      No data matches the selected Year filters.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)', fontSize: '14px' }}>
                No performance data available. Log tests under this category to plot graphs.
              </div>
            )}
          </div>
        )}
      </div>

    </motion.div>
  );
}
