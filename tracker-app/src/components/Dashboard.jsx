import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Legend 
} from 'recharts';
import { Calendar, Award, CheckCircle, Clock } from 'lucide-react';
import { calculateExamDetails } from '../utils/htmlParser';

export default function Dashboard({ folderName, tests, folders, isGeneral }) {
  // GATE 2027 Countdown Target: Feb 6, 2027 09:00:00
  const targetDate = new Date('2027-02-06T09:00:00').getTime();
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

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

  // Compute overall stats
  const totalTests = tests.length;
  
  const avgMarks = totalTests > 0 
    ? (tests.reduce((acc, t) => acc + t.marks, 0) / totalTests).toFixed(2)
    : '0.00';
    
  const avgAccuracy = totalTests > 0
    ? Math.round(tests.reduce((acc, t) => {
        const accNum = parseInt(t.accuracy) || 0;
        return acc + accNum;
      }, 0) / totalTests)
    : 0;

  const totalAttempted = tests.reduce((acc, t) => acc + t.attempted, 0);
  const totalQuestions = tests.reduce((acc, t) => acc + t.totalQs, 0);
  const attemptRate = totalQuestions > 0
    ? Math.round((totalAttempted / totalQuestions) * 100)
    : 0;

  // Prepare overall timeline chart data
  const sortedTests = [...tests].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  const timelineData = sortedTests.map((t, idx) => {
    const yearMatch = t.title.match(/\b(19|20)\d{2}\b/);
    const shortName = yearMatch ? yearMatch[0] : `T${idx + 1}`;
    
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
    
    return {
      name: shortName,
      fullTitle: t.title,
      marks: t.marks,
      accuracy: parseInt(t.accuracy) || 0,
      attempted: t.attempted,
      awardedMarks,
      penalty
    };
  });

  // Compile Category Comparison Data (General Dashboard only)
  let categoryComparisonData = [];
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

    tests.forEach(t => {
      if (folderStats[t.folderId]) {
        folderStats[t.folderId].totalMarks += t.marks;
        folderStats[t.folderId].totalAccuracy += (parseInt(t.accuracy) || 0);
        folderStats[t.folderId].count++;
      }
    });

    categoryComparisonData = Object.keys(folderStats).map(key => {
      const stats = folderStats[key];
      return {
        name: stats.name,
        'Avg Marks': stats.count > 0 ? parseFloat((stats.totalMarks / stats.count).toFixed(2)) : 0,
        'Avg Accuracy %': stats.count > 0 ? Math.round(stats.totalAccuracy / stats.count) : 0,
        'Tests Logged': stats.count
      };
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Section: Welcome & Countdown */}
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

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary)' }}>
            <Calendar size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalTests}</span>
            <span class="stat-label">Total Tests Logged</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--color-secondary)' }}>
            <Award size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{avgMarks}</span>
            <span class="stat-label">Overall Average Score</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
            <CheckCircle size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{avgAccuracy}%</span>
            <span class="stat-label">Overall Avg Accuracy</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}>
            <Clock size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{attemptRate}%</span>
            <span class="stat-label">Overall Attempt Rate</span>
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
                  <h3>Category Performance Comparison</h3>
                  <p>Comparing scores and accuracy across different classes / folders</p>
                </div>
              </div>
              <div style={{ width: '100%', height: 300 }}>
                {tests.length > 0 ? (
                  <ResponsiveContainer>
                    <BarChart data={categoryComparisonData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-sidebar)', 
                          borderColor: 'var(--border-card)',
                          borderRadius: '8px',
                          color: 'var(--text-main)' 
                        }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="Avg Marks" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Avg Accuracy %" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} />
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
            <div className="glass-card">
              <div className="chart-header">
                <div className="chart-title">
                  <h3>Overall Study Progression</h3>
                  <p>General timeline of test scores over time</p>
                </div>
              </div>
              <div style={{ width: '100%', height: 300 }}>
                {tests.length > 0 ? (
                  <ResponsiveContainer>
                    <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorOverallMarks" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="colorOverallAwarded" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="colorOverallPenalty" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-danger)" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="var(--color-danger)" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="colorOverallAccuracy" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-secondary)" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="var(--color-secondary)" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="colorOverallAttempts" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-warning)" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="var(--color-warning)" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-sidebar)', 
                          borderColor: 'var(--border-card)',
                          borderRadius: '8px',
                          color: 'var(--text-main)' 
                        }}
                        labelFormatter={(label, payload) => payload && payload[0] ? payload[0].payload.fullTitle : label}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Area type="monotone" dataKey="marks" name="Marks Obtained" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorOverallMarks)" />
                      <Area type="monotone" dataKey="awardedMarks" name="Marks Without Penalty" stroke="var(--color-success)" strokeWidth={2} fillOpacity={1} fill="url(#colorOverallAwarded)" />
                      <Area type="monotone" dataKey="penalty" name="Penalty" stroke="var(--color-danger)" strokeWidth={2} fillOpacity={1} fill="url(#colorOverallPenalty)" />
                      <Area type="monotone" dataKey="accuracy" name="Accuracy %" stroke="var(--color-secondary)" strokeWidth={1} fillOpacity={1} fill="url(#colorOverallAccuracy)" />
                      <Area type="monotone" dataKey="attempted" name="Questions Attempted" stroke="var(--color-warning)" strokeWidth={1.5} fillOpacity={1} fill="url(#colorOverallAttempts)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)', fontSize: '14px' }}>
                    No overall progression timeline available.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Scoped Category Chart */
          <div className="glass-card full-width-chart-card">
            <div className="chart-header">
              <div className="chart-title">
                <h3>Performance Progression</h3>
                <p>Graph showing marks yearwise / test-by-test</p>
              </div>
            </div>
            
            <div style={{ width: '100%', height: 300 }}>
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
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--bg-sidebar)', 
                        borderColor: 'var(--border-card)',
                        borderRadius: '8px',
                        color: 'var(--text-main)' 
                      }}
                      labelFormatter={(label, payload) => payload && payload[0] ? payload[0].payload.fullTitle : label}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Area type="monotone" dataKey="marks" name="Marks Obtained" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorMarks)" />
                    <Area type="monotone" dataKey="awardedMarks" name="Marks Without Penalty" stroke="var(--color-success)" strokeWidth={2} fillOpacity={1} fill="url(#colorAwarded)" />
                    <Area type="monotone" dataKey="penalty" name="Penalty" stroke="var(--color-danger)" strokeWidth={2} fillOpacity={1} fill="url(#colorPenalty)" />
                    <Area type="monotone" dataKey="accuracy" name="Accuracy %" stroke="var(--color-secondary)" strokeWidth={1} fillOpacity={1} fill="url(#colorAccuracy)" />
                    <Area type="monotone" dataKey="attempted" name="Questions Attempted" stroke="var(--color-warning)" strokeWidth={1.5} fillOpacity={1} fill="url(#colorAttempts)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)', fontSize: '14px' }}>
                  No performance data available. Log tests under this category to plot graphs.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
