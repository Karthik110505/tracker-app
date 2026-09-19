import React from 'react';
import { 
  X, Calendar, Clock, Award, Target, CheckCircle, 
  XCircle, HelpCircle, AlertTriangle, Tag, FileText, 
  Sun, Sunset, BarChart2 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function MobileTestDetail({ test, folders = [], onClose }) {
  if (!test) return null;

  const folder = folders.find(f => f.id === test.folderId);
  const categoryName = folder ? folder.name : (test.folderId || 'General');
  const categoryColor = folder?.color || '#6366f1';

  // Marks percentage
  const marksPct = test.totalMarks > 0 ? Math.min(100, Math.max(0, (test.marks / test.totalMarks) * 100)) : 0;
  const accuracyNum = parseInt(test.accuracy) || 0;
  const attemptRateNum = test.attemptRateVal || (test.totalQs > 0 ? Math.round((test.attempted / test.totalQs) * 100) : 0);

  // Derived awarded & penalty estimates
  const correctVal = test.correct || 0;
  const incorrectVal = test.incorrect || 0;
  const marksVal = test.marks || 0;
  const denominator = correctVal - (incorrectVal / 3);
  let awarded = marksVal;
  let penalty = 0;
  if (denominator > 0) {
    const w = marksVal / denominator;
    awarded = parseFloat((correctVal * w).toFixed(2));
    penalty = parseFloat((incorrectVal * w / 3).toFixed(2));
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
          backgroundColor: '#0b1329',
          borderTopLeftRadius: '28px',
          borderTopRightRadius: '28px',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          padding: '20px 20px 36px 20px',
          overflowY: 'auto',
          boxShadow: '0 -15px 50px rgba(0, 0, 0, 0.7)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Swipe bar */}
        <div style={{
          width: '44px',
          height: '4px',
          borderRadius: '2px',
          backgroundColor: 'rgba(255, 255, 255, 0.25)',
          margin: '0 auto 16px auto'
        }} />

        {/* Top bar with category pill and close button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              backgroundColor: `${categoryColor}22`,
              color: categoryColor,
              border: `1px solid ${categoryColor}44`,
              textTransform: 'uppercase'
            }}>
              {categoryName}
            </span>

            {test.session && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: test.session === 'morning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                color: test.session === 'morning' ? '#fbbf24' : '#a5b4fc',
                border: `1px solid ${test.session === 'morning' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
              }}>
                {test.session === 'morning' ? <Sun size={12} /> : <Sunset size={12} />}
                <span style={{ textTransform: 'capitalize' }}>{test.session}</span>
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Exam Title & Date */}
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', lineHeight: 1.3, marginBottom: '6px' }}>
          {test.title}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: '#94a3b8', fontSize: '13px', marginBottom: '22px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Calendar size={14} style={{ color: '#818cf8' }} />
            {test.date}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={14} style={{ color: '#818cf8' }} />
            {test.timeTaken || test.duration}
          </span>
        </div>

        {/* HERO SCORE CARD */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))',
          borderRadius: '20px',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          padding: '24px 20px',
          textAlign: 'center',
          marginBottom: '20px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#a5b4fc', marginBottom: '6px' }}>
            Total Score Achieved
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '6px' }}>
            <span style={{
              fontSize: '46px',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #ffffff 30%, #818cf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-1px'
            }}>
              {test.marks}
            </span>
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#64748b' }}>
              / {test.totalMarks}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '4px',
            overflow: 'hidden',
            margin: '16px 0 12px 0'
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${marksPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #6366f1, #10b981)',
                borderRadius: '4px'
              }}
            />
          </div>

          {/* Micro stats inside hero */}
          <div style={{ display: 'flex', justifyContent: 'space-around', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Accuracy</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#34d399' }}>{test.accuracy}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Attempt Rate</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#60a5fa' }}>{test.attemptRate || `${attemptRateNum}%`}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Difficulty</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#f59e0b' }}>{test.difficulty || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* QUESTION BREAKDOWN (Correct, Incorrect, Unattempted) */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', marginBottom: '10px' }}>
            Question Breakdown ({test.totalQs} Questions)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '14px',
              padding: '12px 10px',
              textAlign: 'center'
            }}>
              <CheckCircle size={18} style={{ color: '#10b981', margin: '0 auto 4px auto' }} />
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#34d399' }}>{test.correct}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Correct</div>
            </div>

            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '14px',
              padding: '12px 10px',
              textAlign: 'center'
            }}>
              <XCircle size={18} style={{ color: '#ef4444', margin: '0 auto 4px auto' }} />
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#f87171' }}>{test.incorrect}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Incorrect</div>
            </div>

            <div style={{
              background: 'rgba(148, 163, 184, 0.08)',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              borderRadius: '14px',
              padding: '12px 10px',
              textAlign: 'center'
            }}>
              <HelpCircle size={18} style={{ color: '#94a3b8', margin: '0 auto 4px auto' }} />
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#cbd5e1' }}>{test.notAttempted}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unattempted</div>
            </div>
          </div>
        </div>

        {/* PENALTY & AWARDED BREAKDOWN */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          marginBottom: '20px'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '12px 14px'
          }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Awarded Marks</span>
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#34d399', marginTop: '2px' }}>
              +{awarded}
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '12px 14px'
          }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Negative Penalty</span>
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#f87171', marginTop: '2px' }}>
              -{penalty}
            </div>
          </div>
        </div>

        {/* RANK & CANDIDATES (if available) */}
        {(test.rankGot || test.totalCandidates) && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.08)',
            borderRadius: '14px',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            padding: '12px 14px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: '13px', color: '#fbbf24', fontWeight: 600 }}>Rank Achieved</span>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc' }}>
              AIR {test.rankGot || 'N/A'} {test.totalCandidates ? `/ ${test.totalCandidates.toLocaleString()}` : ''}
            </div>
          </div>
        )}

        {/* NOTES & TAGS */}
        {test.notes && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '14px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
              <FileText size={14} />
              <span>Revision Notes</span>
            </div>
            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
              {test.notes}
            </p>
          </div>
        )}

        {/* TAGS */}
        {test.tags && test.tags.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <Tag size={13} style={{ color: '#94a3b8' }} />
            {test.tags.map((tag, idx) => (
              <span key={idx} style={{
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                color: '#cbd5e1'
              }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '14px',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.08)',
            color: '#f8fafc',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Done
        </button>
      </motion.div>
    </div>
  );
}
