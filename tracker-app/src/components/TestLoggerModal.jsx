import React, { useState, useRef } from 'react';
import { UploadCloud, X, AlertCircle, CheckCircle } from 'lucide-react';
import { parseOfflineHtml } from '../utils/htmlParser';

export default function TestLoggerModal({ folderId, folders, onClose, onSave, editTest }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ type: '', message: '' });
  const [parserSource, setParserSource] = useState('auto');
  const fileInputRef = useRef(null);

  // Form Fields State
  const [formData, setFormData] = useState({
    folderId: editTest ? editTest.folderId : (folderId || (folders.length > 0 ? folders[0].id : '')),
    title: editTest ? editTest.title : '',
    date: editTest ? editTest.date : new Date().toISOString().split('T')[0],
    marks: editTest ? editTest.marks.toString() : '',
    totalMarks: editTest ? editTest.totalMarks.toString() : '100',
    attempted: editTest ? editTest.attempted.toString() : '',
    totalQs: editTest ? editTest.totalQs.toString() : '65',
    correct: editTest ? editTest.correct.toString() : '',
    incorrect: editTest ? editTest.incorrect.toString() : '',
    notAttempted: editTest ? editTest.notAttempted.toString() : '',
    duration: editTest ? editTest.duration : '180 Min',
    timeTaken: editTest ? editTest.timeTaken : '',
    accuracy: editTest ? editTest.accuracy : '',
    notes: editTest ? editTest.notes : '',
    tags: editTest && editTest.tags ? editTest.tags.join(', ') : '',
    paperHtml: editTest ? editTest.paperHtml : ''
  });

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      setUploadStatus({
        type: 'error',
        message: 'Unsupported format. Please upload a saved offline .html file.'
      });
      return;
    }

    setUploadStatus({ type: 'loading', message: 'Reading and parsing file...' });

    const reader = new FileReader();
    reader.onload = (event) => {
      const htmlText = event.target.result;
      const parsed = parseOfflineHtml(htmlText, parserSource);

      if (parsed.success) {
        setFormData(prev => ({
          ...prev,
          title: parsed.title,
          marks: parsed.marks.toString(),
          totalMarks: parsed.totalMarks.toString(),
          attempted: parsed.attempted.toString(),
          totalQs: parsed.totalQs.toString(),
          correct: parsed.correct.toString(),
          incorrect: parsed.incorrect.toString(),
          notAttempted: parsed.notAttempted.toString(),
          duration: parsed.duration,
          timeTaken: parsed.timeTaken,
          accuracy: parsed.accuracy,
          paperHtml: htmlText // Store the full paper content!
        }));
        
        setUploadStatus({
          type: 'success',
          message: `Successfully extracted data from: ${parsed.title}`
        });
      } else {
        setUploadStatus({
          type: 'error',
          message: `Extraction failed: ${parsed.error || 'Check file formatting.'}`
        });
      }
    };
    reader.onerror = () => {
      setUploadStatus({ type: 'error', message: 'Failed to read file.' });
    };
    reader.readAsText(file);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto-compute unattempted questions if attempted is edited manually
      if (name === 'attempted' && value !== '') {
        const total = parseInt(prev.totalQs) || 65;
        const att = parseInt(value) || 0;
        updated.notAttempted = Math.max(0, total - att).toString();
      }
      
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Please enter an exam title.');
      return;
    }

    if (!formData.folderId) {
      alert('Please select a category folder.');
      return;
    }

    // Compute accuracy if not already parsed
    let accuracyStr = formData.accuracy;
    if (!accuracyStr && formData.correct && formData.attempted) {
      const corr = parseInt(formData.correct) || 0;
      const att = parseInt(formData.attempted) || 0;
      if (att > 0) {
        accuracyStr = `${Math.round((corr / att) * 100)}%`;
      }
    }

    const testRecord = {
      id: editTest ? editTest.id : Date.now().toString(),
      folderId: formData.folderId,
      title: formData.title.trim(),
      date: formData.date,
      marks: parseFloat(formData.marks) || 0,
      totalMarks: parseFloat(formData.totalMarks) || 100,
      attempted: parseInt(formData.attempted) || 0,
      totalQs: parseInt(formData.totalQs) || 65,
      correct: parseInt(formData.correct) || 0,
      incorrect: parseInt(formData.incorrect) || 0,
      notAttempted: parseInt(formData.notAttempted) || 0,
      duration: formData.duration,
      timeTaken: formData.timeTaken || '180 Min',
      accuracy: accuracyStr || '0%',
      notes: formData.notes.trim(),
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      paperHtml: formData.paperHtml
    };

    onSave(testRecord);
  };

  return (
    <div className="glass-card" style={{ padding: '32px', animation: 'slideUp 0.3s ease-out' }}>
      <div className="paper-viewer-header" style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-card)', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>
            {editTest ? 'Edit Exam Results' : 'Log Exam Results'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            {editTest ? 'Modify your performance metrics, notes, or tags for this exam' : 'Upload your offline HTML paper or fill out your performance details manually'}
          </p>
        </div>
        <button 
          onClick={onClose} 
          className="btn btn-danger" 
          style={{ padding: '8px', borderRadius: '50%' }}
          title="Cancel and Go Back"
          type="button"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        
        {/* Exam Platform/HTML Source Selector */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', display: 'block', color: 'var(--text-muted)' }}>
            Exam Results HTML Source Platform
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            {['auto', 'gatearchive', 'gateoverflow'].map((source) => (
              <label 
                key={source} 
                style={{ 
                  flex: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '10px 14px', 
                  background: parserSource === source ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.02)', 
                  border: parserSource === source ? '1px solid var(--color-primary)' : '1px solid var(--border-card)', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: parserSource === source ? '600' : 'normal',
                  transition: 'all 0.2s ease',
                  color: parserSource === source ? 'var(--text-main)' : 'var(--text-muted)'
                }}
              >
                <input 
                  type="radio" 
                  name="parserSource" 
                  value={source} 
                  checked={parserSource === source} 
                  onChange={() => setParserSource(source)} 
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                <span>
                  {source === 'auto' && '🔍 Auto-Detect'}
                  {source === 'gatearchive' && '🏛️ GATE Archive'}
                  {source === 'gateoverflow' && '🌐 GATE Overflow'}
                </span>
              </label>
            ))}
          </div>
        </div>
        
        {/* Drag & Drop File Upload */}
        <div 
          className={`file-upload-zone ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
          style={{ marginBottom: '24px' }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <UploadCloud className="upload-icon" />
          <div className="upload-text">Upload Offline HTML file</div>
          <div className="upload-subtext">Drag & drop your saved result HTML file or click to browse</div>
        </div>

        {/* Upload Status Banner */}
        {uploadStatus.type === 'error' && (
          <div className="subfolder-warning" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{uploadStatus.message}</span>
          </div>
        )}
        {uploadStatus.type === 'success' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--color-success)', padding: '8px 10px', borderRadius: '6px', fontSize: '12px' }}>
            <CheckCircle size={16} style={{ flexShrink: 0 }} />
            <span>{uploadStatus.message}</span>
          </div>
        )}
        {uploadStatus.type === 'loading' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: 'var(--text-muted)', fontSize: '12px' }}>
            <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
            <span>{uploadStatus.message}</span>
          </div>
        )}

        {/* Form Fields */}
        <div className="form-grid">
          
          {/* Category selector */}
          <div className="form-group form-group-full">
            <label>Category / Folder *</label>
            <select
              name="folderId"
              value={formData.folderId}
              onChange={handleInputChange}
              className="form-input"
              required
            >
              <option value="" disabled>-- Select a Category --</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group form-group-full">
            <label>Exam Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g. GATE CSE 2010 | Original Paper"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label>Date Attempted</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Exam Duration (e.g. 180 Min)</label>
            <input
              type="text"
              name="duration"
              value={formData.duration}
              onChange={handleInputChange}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Resultant Marks</label>
            <input
              type="number"
              step="0.01"
              name="marks"
              value={formData.marks}
              onChange={handleInputChange}
              placeholder="e.g. 45.33"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Total Exam Marks</label>
            <input
              type="number"
              name="totalMarks"
              value={formData.totalMarks}
              onChange={handleInputChange}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Attempted Questions</label>
            <input
              type="number"
              name="attempted"
              value={formData.attempted}
              onChange={handleInputChange}
              placeholder="e.g. 23"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Total Questions</label>
            <input
              type="number"
              name="totalQs"
              value={formData.totalQs}
              onChange={handleInputChange}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Correct Attempts</label>
            <input
              type="number"
              name="correct"
              value={formData.correct}
              onChange={handleInputChange}
              placeholder="e.g. 15"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Incorrect Attempts</label>
            <input
              type="number"
              name="incorrect"
              value={formData.incorrect}
              onChange={handleInputChange}
              placeholder="e.g. 8"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Time Taken (e.g. 120 Min)</label>
            <input
              type="text"
              name="timeTaken"
              value={formData.timeTaken}
              onChange={handleInputChange}
              placeholder="e.g. 120 Min"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Subject / Topic Tags (comma-separated)</label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              placeholder="e.g. OS, Subnetting, Dijkstra"
              className="form-input"
            />
          </div>

          <div className="form-group form-group-full">
            <label>Performance Notes / Revision Strategy</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="What went wrong? Which topics need revision? (e.g., Struggled with subnetting, need to revise Dijkstra)"
              className="form-textarea"
            />
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-card)', paddingTop: '20px', marginTop: '20px' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" className="btn btn-primary">
            {editTest ? 'Save Changes' : 'Save Test Record'}
          </button>
        </div>
      </form>
    </div>
  );
}
