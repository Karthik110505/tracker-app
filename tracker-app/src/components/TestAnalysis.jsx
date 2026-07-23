import React, { useMemo, useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, HelpCircle, Award, Target, Percent, FileText } from 'lucide-react';
import { calculateExamDetails } from '../utils/htmlParser';

export default function TestAnalysis({ test, onClose, onSaveNotes }) {
  // Compute exam details from HTML
  const analysis = useMemo(() => {
    if (!test || !test.paperHtml) return null;
    return calculateExamDetails(test.paperHtml);
  }, [test]);

  const [notesText, setNotesText] = useState(test.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Sync state if the test prop changes
  useEffect(() => {
    setNotesText(test.notes || '');
    setSaveStatus('');
  }, [test]);

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    setSaveStatus('');
    try {
      const updatedTest = {
        ...test,
        notes: notesText
      };
      await onSaveNotes(updatedTest);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (e) {
      alert("Failed to save notes: " + e.message);
      setSaveStatus('error');
    } finally {
      setIsSavingNotes(false);
    }
  };

  if (!analysis || !analysis.success) {
    return (
      <div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-danger)', marginBottom: '12px' }}>Analysis Failed</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          {analysis?.error || 'Unable to parse the questions and responses from this exam paper.'}
        </p>
        <button onClick={onClose} className="btn btn-secondary">
          <ArrowLeft size={16} style={{ marginRight: '8px' }} />
          <span>Back to Dashboard</span>
        </button>
      </div>
    );
  }

  const { summary, questions } = analysis;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'slideUp 0.3s ease-out' }}>
      
      {/* Header Panel */}
      <div className="paper-viewer-header" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-card)' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Exam Results Analysis</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Calculated details for: <strong style={{ color: 'var(--color-primary)' }}>{test.title}</strong> (Attempted on {test.date})
          </p>
        </div>
        <button 
          onClick={onClose} 
          className="btn btn-secondary"
          style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* KPI Metrics Cards Grid */}
      <div className="stats-grid">
        
        {/* Score Card */}
        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary)' }}>
            <Award size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{summary.score.toFixed(2)}</span>
            <span className="stat-label">Calculated Score</span>
          </div>
        </div>

        {/* Accuracy Card */}
        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
            <Percent size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{summary.accuracy}%</span>
            <span className="stat-label">Accuracy Rate</span>
          </div>
        </div>

        {/* Attempt Rate Card */}
        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}>
            <Target size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{summary.attemptRate}%</span>
            <span className="stat-label">Attempt Rate ({summary.attempted}/{summary.totalQuestions})</span>
          </div>
        </div>

      </div>

      {/* Score Breakdown Summary Card */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Detailed Score Breakdown</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          
          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-card)', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ color: 'var(--color-success)', fontWeight: 'bold', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <CheckCircle size={18} />
              {summary.correct}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '6px' }}>Correct Answers</div>
            <div style={{ color: 'var(--color-success)', fontSize: '11px', fontWeight: '600', marginTop: '2px' }}>+{summary.awardedMarks.toFixed(2)} Marks</div>
          </div>

          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-card)', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ color: 'var(--color-danger)', fontWeight: 'bold', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <XCircle size={18} />
              {summary.incorrect}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '6px' }}>Incorrect Answers</div>
            <div style={{ color: 'var(--color-danger)', fontSize: '11px', fontWeight: '600', marginTop: '2px' }}>-{summary.penaltyMarks.toFixed(2)} Penalty</div>
          </div>

          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-card)', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <HelpCircle size={18} />
              {summary.unattempted}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '6px' }}>Unattempted Questions</div>
            <div style={{ color: 'var(--text-dark)', fontSize: '11px', fontWeight: '600', marginTop: '2px' }}>0.00 Marks</div>
          </div>

        </div>
      </div>

      {/* Performance Notes / Exam Review Card */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} style={{ color: 'var(--color-primary)' }} />
          <span>Exam Review & Learnings (Points to Remember)</span>
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '12px' }}>
          Write down what went wrong, conceptual mistakes you made, and what you need to revise for this mock test.
        </p>
        <textarea
          value={notesText}
          onChange={(e) => setNotesText(e.target.value)}
          placeholder="e.g. Silly calculation mistake in Q#7. Need to revise Dijkstra algorithm for Q#34."
          className="form-textarea"
          style={{ width: '100%', minHeight: '100px', marginBottom: '12px', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {saveStatus === 'success' && (
              <span style={{ color: 'var(--color-success)', fontSize: '12px', fontWeight: '600' }}>
                ✓ Learnings saved successfully!
              </span>
            )}
            {saveStatus === 'error' && (
              <span style={{ color: 'var(--color-danger)', fontSize: '12px', fontWeight: '600' }}>
                ✗ Failed to save learnings.
              </span>
            )}
          </div>
          <button 
            onClick={handleSaveNotes} 
            className="btn btn-primary" 
            style={{ padding: '8px 16px', fontSize: '12px' }}
            disabled={isSavingNotes}
          >
            {isSavingNotes ? 'Saving...' : 'Save Learnings & Review'}
          </button>
        </div>
      </div>

      {/* Question Analysis Grid */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Question-by-Question Analysis</h3>
        
        <div className="records-table-container">
          <table className="records-table">
            <thead>
              <tr>
                <th>Q No</th>
                <th>Type</th>
                <th>Weight</th>
                <th>Penalty</th>
                <th>Your Answer</th>
                <th>Correct Answer</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Points</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q, idx) => {
                let statusBadge = null;
                let rowStyle = {};
                let pointsStyle = {};

                if (q.status === 'correct') {
                  statusBadge = (
                    <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={10} /> Correct
                    </span>
                  );
                  rowStyle = { background: 'rgba(16, 185, 129, 0.02)' };
                  pointsStyle = { color: 'var(--color-success)', fontWeight: 'bold' };
                } else if (q.status === 'incorrect') {
                  statusBadge = (
                    <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <XCircle size={10} /> Incorrect
                    </span>
                  );
                  rowStyle = { background: 'rgba(239, 68, 68, 0.02)' };
                  pointsStyle = { color: 'var(--color-danger)', fontWeight: 'bold' };
                } else {
                  statusBadge = (
                    <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                      <HelpCircle size={10} /> Unattempted
                    </span>
                  );
                  pointsStyle = { color: 'var(--text-dark)' };
                }

                return (
                  <tr key={idx} style={rowStyle}>
                    <td style={{ fontWeight: 'bold' }}>{q.num}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{q.type}</td>
                    <td>{q.award} Mark{q.award > 1 ? 's' : ''}</td>
                    <td style={{ color: q.penalty > 0 ? 'var(--color-warning)' : 'var(--text-dark)' }}>
                      {q.penalty > 0 ? `-${q.penalty.toFixed(2)}` : '0.00'}
                    </td>
                    <td style={{ textTransform: 'uppercase', fontWeight: q.yourAnswer ? 'bold' : 'normal', color: q.yourAnswer ? 'var(--text-main)' : 'var(--text-dark)' }}>
                      {q.yourAnswer || '-'}
                    </td>
                    <td style={{ textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                      {q.correctAnswer}
                    </td>
                    <td>{statusBadge}</td>
                    <td style={{ textAlign: 'right', ...pointsStyle }}>
                      {q.score > 0 ? `+${q.score.toFixed(2)}` : q.score < 0 ? `${q.score.toFixed(2)}` : '0.00'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
