import React, { useState, useEffect } from 'react';
import { 
  Calendar, Award, Target, CheckCircle2, TrendingUp, 
  Clock, ArrowRight, Zap, Flame, Compass, ChevronRight 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function MobileHome({ tests = [], folders = [], onSelectTest, onNavigateTab }) {
  // GATE 2027 Countdown Target: Feb 6, 2027 09:00:00
  const targetDate = new Date('2027-02-06T09:00:00').getTime();
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const now = new Date().getTime();
    const difference = targetDate - now;
    if (difference <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60)
    };
  }

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute key preparation statistics
  const totalTests = tests.length;
  const avgMarks = totalTests > 0 
    ? (tests.reduce((acc, t) => acc + (t.marks || 0), 0) / totalTests).toFixed(2)
    : '0.00';
  
  const bestMarks = totalTests > 0 
    ? Math.max(...tests.map(t => t.marks || 0)).toFixed(2)
    : '0.00';

  const avgAccuracy = totalTests > 0
    ? Math.round(tests.reduce((acc, t) => acc + (parseInt(t.accuracy) || 0), 0) / totalTests)
    : 0;

  const totalAttempted = tests.reduce((acc, t) => acc + (t.attempted || 0), 0);
  const totalQuestions = tests.reduce((acc, t) => acc + (t.totalQs || 65), 0);
  const avgAttemptRate = totalQuestions > 0
    ? Math.round((totalAttempted / totalQuestions) * 100)
    : 0;

  // Latest test taken
  const sortedTests = [...tests].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latestTest = sortedTests[0] || null;

  return (
    <div style={{ padding: '16px 16px 80px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. GATE 2027 COUNTDOWN CARD */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.15))',
          borderRadius: '24px',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          padding: '20px 16px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f87171'
            }}>
              <Flame size={16} />
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: '#f8fafc', letterSpacing: '0.3px' }}>
                GATE 2027 COUNTDOWN
              </h4>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Target: 06 February 2027</span>
            </div>
          </div>
          <span style={{
            padding: '3px 8px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 700,
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            Active
          </span>
        </div>

        {/* 4 Clock Blocks */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {[
            { label: 'DAYS', val: timeLeft.days },
            { label: 'HOURS', val: String(timeLeft.hours).padStart(2, '0') },
            { label: 'MINS', val: String(timeLeft.minutes).padStart(2, '0') },
            { label: 'SECS', val: String(timeLeft.seconds).padStart(2, '0') }
          ].map((item, idx) => (
            <div key={idx} style={{
              background: 'rgba(15, 23, 42, 0.65)',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '10px 4px',
              textAlign: 'center',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{
                fontSize: '22px',
                fontWeight: 900,
                color: '#f8fafc',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.5px',
                lineHeight: 1
              }}>
                {item.val}
              </div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', marginTop: '4px', letterSpacing: '0.8px' }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 2. LATEST EXAM HIGHLIGHT CARD */}
      {latestTest && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{
            background: 'rgba(30, 41, 59, 0.7)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '16px',
            cursor: 'pointer'
          }}
          onClick={() => onSelectTest && onSelectTest(latestTest)}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Most Recent Exam
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{latestTest.date}</span>
          </div>

          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', margin: '0 0 12px 0', lineHeight: 1.3 }}>
            {latestTest.title}
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '26px', fontWeight: 900, color: '#34d399', letterSpacing: '-0.5px' }}>
                {latestTest.marks}
              </span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>/ {latestTest.totalMarks}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                padding: '4px 8px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 600,
                background: 'rgba(255, 255, 255, 0.06)',
                color: '#cbd5e1'
              }}>
                Acc: {latestTest.accuracy}
              </span>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818cf8'
              }}>
                <ChevronRight size={16} />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 3. CORE KPI STATS GRID (2x2) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
            Overall Preparation Metrics
          </h4>
          <button
            onClick={() => onNavigateTab && onNavigateTab('analytics')}
            style={{
              background: 'none',
              border: 'none',
              color: '#818cf8',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            <span>Analytics</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Card 1: Tests Taken */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '18px',
            padding: '16px 14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', marginBottom: '6px' }}>
              <Award size={16} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>Tests Completed</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#f8fafc' }}>
              {totalTests}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Across {folders.length} categories
            </div>
          </div>

          {/* Card 2: Average Marks */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '18px',
            padding: '16px 14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', marginBottom: '6px' }}>
              <TrendingUp size={16} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>Average Score</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#f8fafc' }}>
              {avgMarks}
            </div>
            <div style={{ fontSize: '11px', color: '#34d399', marginTop: '2px' }}>
              Best: {bestMarks}
            </div>
          </div>

          {/* Card 3: Average Accuracy */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '18px',
            padding: '16px 14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa', marginBottom: '6px' }}>
              <CheckCircle2 size={16} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>Avg Accuracy</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#f8fafc' }}>
              {avgAccuracy}%
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Target: &gt;80%
            </div>
          </div>

          {/* Card 4: Questions Attempted */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '18px',
            padding: '16px 14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', marginBottom: '6px' }}>
              <Target size={16} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>Attempt Rate</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#f8fafc' }}>
              {avgAttemptRate}%
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              {totalAttempted} Qs solved
            </div>
          </div>
        </div>
      </div>

      {/* 4. CATEGORIES OVERVIEW CHIPS */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
            Subject Categories
          </h4>
          <button
            onClick={() => onNavigateTab && onNavigateTab('categories')}
            style={{
              background: 'none',
              border: 'none',
              color: '#818cf8',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            View All
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {folders.map(f => {
            const fTests = tests.filter(t => t.folderId === f.id);
            const fAvg = fTests.length > 0 
              ? (fTests.reduce((acc, t) => acc + (t.marks || 0), 0) / fTests.length).toFixed(1)
              : '0';
            return (
              <div
                key={f.id}
                onClick={() => onNavigateTab && onNavigateTab('tests', f.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(30, 41, 59, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: f.color || '#6366f1'
                  }} />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                    {f.name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {fTests.length} tests
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#34d399' }}>
                    Avg: {fAvg}
                  </span>
                  <ChevronRight size={14} style={{ color: '#64748b' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
