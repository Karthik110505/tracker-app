import React, { useState } from 'react';
import { X, Plus, Calendar, Clock, Award, Target, CheckCircle2, XCircle, AlertTriangle, Tag, FileText, Sun, Sunset, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MobileTestLoggerModal({ folders = [], onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState(folders[0]?.id || 'gate');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [session, setSession] = useState(null); // 'morning' | 'afternoon' | null
  const [marks, setMarks] = useState('');
  const [totalMarks, setTotalMarks] = useState('100');
  const [attempted, setAttempted] = useState('');
  const [totalQs, setTotalQs] = useState('65');
  const [correct, setCorrect] = useState('');
  const [incorrect, setIncorrect] = useState('');
  const [timeTakenMinutes, setTimeTakenMinutes] = useState('180');
  const [difficulty, setDifficulty] = useState(3);
  const [notes, setNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Auto-derive accuracy
  const numCorrect = parseInt(correct) || 0;
  const numAttempted = parseInt(attempted) || 0;
  const autoAccuracy = numAttempted > 0 ? ((numCorrect / numAttempted) * 100).toFixed(1) : '0';

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const clean = tagInput.trim().replace(/^#/, '');
      if (clean && !tags.includes(clean)) {
        setTags(prev => [...prev, clean]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (t) => {
    setTags(prev => prev.filter(tag => tag !== t));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter an exam title.');
      return;
    }
    if (marks === '') {
      setError('Please enter marks obtained.');
      return;
    }

    setSaving(true);
    setError('');

    const parsedMarks = parseFloat(marks) || 0;
    const parsedTotalMarks = parseFloat(totalMarks) || 100;
    const parsedAttempted = parseInt(attempted) || 0;
    const parsedTotalQs = parseInt(totalQs) || 65;
    const parsedCorrect = parseInt(correct) || 0;
    const parsedIncorrect = parseInt(incorrect) || 0;
    const parsedNotAttempted = Math.max(0, parsedTotalQs - parsedAttempted);
    const accuracyStr = `${autoAccuracy}%`;
    const attemptRateVal = parsedTotalQs > 0 ? parseFloat(((parsedAttempted / parsedTotalQs) * 100).toFixed(1)) : 0;
    const attemptRateStr = `${attemptRateVal}%`;
    const mins = parseInt(timeTakenMinutes) || 0;
    const durationStr = `${mins} Min`;

    // Extract year from title if present (e.g. 2024)
    const yearMatch = title.match(/\b(19|20)\d{2}\b/);
    const gateYear = yearMatch ? yearMatch[0] : null;

    const newTest = {
      id: Date.now().toString(),
      folderId,
      title: title.trim(),
      date,
      session,
      duration: durationStr,
      timeTaken: durationStr,
      timeTakenMinutes: mins,
      marks: parsedMarks,
      totalMarks: parsedTotalMarks,
      attempted: parsedAttempted,
      totalQs: parsedTotalQs,
      correct: parsedCorrect,
      incorrect: parsedIncorrect,
      notAttempted: parsedNotAttempted,
      accuracy: accuracyStr,
      accuracyVal: parseFloat(autoAccuracy),
      attemptRate: attemptRateStr,
      attemptRateVal,
      difficulty,
      gateYear,
      gateShift: session,
      notes: notes.trim(),
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await onSave(newTest);
      onClose();
    } catch (err) {
      setError(`Failed to save test: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
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
          backgroundColor: '#0f172a',
          borderTopLeftRadius: '28px',
          borderTopRightRadius: '28px',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          padding: '20px 20px 36px 20px',
          overflowY: 'auto',
          boxShadow: '0 -15px 50px rgba(0, 0, 0, 0.7)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Swipe Pill */}
        <div style={{
          width: '40px',
          height: '4px',
          borderRadius: '2px',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          margin: '0 auto 16px auto'
        }} />

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.25))',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8'
            }}>
              <Plus size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                Log Test Result
              </h3>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Add exam metrics directly to your records
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
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

        {error && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '12px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Exam Title */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Exam Title *
            </label>
            <input
              type="text"
              placeholder="e.g. GATE CS 2024 Set 1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                backgroundColor: 'rgba(30, 41, 59, 0.6)',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Category Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Subject Category
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {folders.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFolderId(f.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: folderId === f.id ? (f.color || '#6366f1') : 'rgba(255, 255, 255, 0.05)',
                    color: folderId === f.id ? '#ffffff' : '#cbd5e1',
                    border: `1px solid ${folderId === f.id ? (f.color || '#6366f1') : 'rgba(255, 255, 255, 0.1)'}`
                  }}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Session */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Exam Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  backgroundColor: 'rgba(30, 41, 59, 0.6)',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Shift / Session
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setSession(session === 'morning' ? null : 'morning')}
                  style={{
                    flex: 1,
                    padding: '9px 6px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    background: session === 'morning' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${session === 'morning' ? '#fbbf24' : 'rgba(255, 255, 255, 0.08)'}`,
                    color: session === 'morning' ? '#fbbf24' : '#94a3b8'
                  }}
                >
                  <Sun size={13} />
                  <span>Morning</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSession(session === 'afternoon' ? null : 'afternoon')}
                  style={{
                    flex: 1,
                    padding: '9px 6px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    background: session === 'afternoon' ? 'rgba(165, 180, 252, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${session === 'afternoon' ? '#818cf8' : 'rgba(255, 255, 255, 0.08)'}`,
                    color: session === 'afternoon' ? '#a5b4fc' : '#94a3b8'
                  }}
                >
                  <Sunset size={13} />
                  <span>Afternoon</span>
                </button>
              </div>
            </div>
          </div>

          {/* Marks Obtained & Total Marks */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Marks Obtained *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 52.33"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  backgroundColor: 'rgba(30, 41, 59, 0.6)',
                  color: '#34d399',
                  fontSize: '16px',
                  fontWeight: 700,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Total Marks
              </label>
              <input
                type="number"
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  backgroundColor: 'rgba(30, 41, 59, 0.6)',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Question Breakdown: Attempted, Correct, Incorrect */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                Attempted
              </label>
              <input
                type="number"
                placeholder="0"
                value={attempted}
                onChange={(e) => setAttempted(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'rgba(30, 41, 59, 0.6)',
                  color: '#fbbf24',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                Correct
              </label>
              <input
                type="number"
                placeholder="0"
                value={correct}
                onChange={(e) => setCorrect(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'rgba(30, 41, 59, 0.6)',
                  color: '#34d399',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                Incorrect
              </label>
              <input
                type="number"
                placeholder="0"
                value={incorrect}
                onChange={(e) => setIncorrect(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'rgba(30, 41, 59, 0.6)',
                  color: '#f87171',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Auto Accuracy Badge */}
          {numAttempted > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: '10px',
              background: 'rgba(52, 211, 153, 0.1)',
              border: '1px solid rgba(52, 211, 153, 0.25)',
              fontSize: '12px'
            }}>
              <span style={{ color: '#94a3b8' }}>Calculated Accuracy:</span>
              <span style={{ color: '#34d399', fontWeight: 700 }}>{autoAccuracy}%</span>
            </div>
          )}

          {/* Difficulty Rating */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Difficulty Rating (1 to 5)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setDifficulty(lvl)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    background: difficulty >= lvl ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${difficulty >= lvl ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)'}`,
                    color: difficulty >= lvl ? '#fbbf24' : '#64748b'
                  }}
                >
                  <Star size={14} fill={difficulty >= lvl ? '#fbbf24' : 'none'} />
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>{lvl}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Exam Notes & Mistakes
            </label>
            <textarea
              placeholder="e.g. Slipped up on pipelining hazards in COA..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                backgroundColor: 'rgba(30, 41, 59, 0.6)',
                color: '#ffffff',
                fontSize: '13px',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Tags */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Revision Tags (type & press Enter)
            </label>
            <input
              type="text"
              placeholder="e.g. COA, OS, Algo"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                backgroundColor: 'rgba(30, 41, 59, 0.6)',
                color: '#ffffff',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {tags.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {tags.map(t => (
                  <span
                    key={t}
                    onClick={() => handleRemoveTag(t)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: 'rgba(99, 102, 241, 0.2)',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      color: '#a5b4fc',
                      cursor: 'pointer'
                    }}
                    title="Tap to remove tag"
                  >
                    <span>#{t}</span>
                    <X size={11} />
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#94a3b8',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 2,
                padding: '14px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)'
              }}
            >
              {saving ? 'Saving...' : 'Save Result Directly'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
