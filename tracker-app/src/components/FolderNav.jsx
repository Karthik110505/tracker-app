import React, { useState } from 'react';
import { Folder, FolderOpen, Plus, Trash2, X, Check, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FolderNav({ folders, activeFolderId, onSelectFolder, onCreateFolder, onDeleteFolder }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    
    const id = newFolderName.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '_');
    onCreateFolder({
      id: id || Date.now().toString(),
      name: newFolderName.trim()
    });
    
    setNewFolderName('');
    setIsAdding(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsAdding(false);
      setNewFolderName('');
    }
  };

  return (
    <div className="folder-nav">
      {/* Permanent General Dashboard Tab */}
      <motion.div 
        onClick={() => onSelectFolder(null)}
        className={`folder-item ${activeFolderId === null ? 'active' : ''}`}
        style={{ marginBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '10px', paddingBottom: '12px', position: 'relative' }}
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
      >
        {activeFolderId === null && (
          <motion.div
            layoutId="activeFolderGlow"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(139, 92, 246, 0.12) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              borderRadius: '10px',
              zIndex: 0,
              pointerEvents: 'none'
            }}
          />
        )}
        {activeFolderId === null && (
          <motion.div
            layoutId="activeFolderIndicator"
            style={{
              position: 'absolute',
              left: 0,
              top: '15%',
              height: '70%',
              width: '3px',
              borderRadius: '0 4px 4px 0',
              background: 'linear-gradient(to bottom, var(--color-primary), var(--color-secondary))',
              boxShadow: '0 0 6px var(--color-primary)',
              zIndex: 1
            }}
          />
        )}
        <div className="folder-left" style={{ position: 'relative', zIndex: 2 }}>
          <LayoutDashboard size={16} />
          <span style={{ fontWeight: '600' }}>General Dashboard</span>
        </div>
      </motion.div>

      <div className="folder-nav-header">
        <h3>Categories</h3>
        <button 
          onClick={() => setIsAdding(!isAdding)} 
          className="btn-add-folder"
          title="Add New Category"
        >
          {isAdding ? <X size={16} /> : <Plus size={16} />}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} style={{ marginBottom: '12px', padding: '0 8px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              placeholder="Folder name (e.g. gate)"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="form-input"
              style={{ padding: '6px 10px', fontSize: '13px' }}
            />
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ padding: '6px 10px' }}
            >
              <Check size={14} />
            </button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {folders.map((folder) => {
          const isActive = folder.id === activeFolderId;
          return (
            <motion.div 
              key={folder.id}
              onClick={() => onSelectFolder(folder.id)}
              className={`folder-item ${isActive ? 'active' : ''}`}
              style={{ position: 'relative' }}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeFolderGlow"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(139, 92, 246, 0.12) 100%)',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    borderRadius: '10px',
                    zIndex: 0,
                    pointerEvents: 'none'
                  }}
                />
              )}
              {isActive && (
                <motion.div
                  layoutId="activeFolderIndicator"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '15%',
                    height: '70%',
                    width: '3px',
                    borderRadius: '0 4px 4px 0',
                    background: 'linear-gradient(to bottom, var(--color-primary), var(--color-secondary))',
                    boxShadow: '0 0 6px var(--color-primary)',
                    zIndex: 1
                  }}
                />
              )}
              <div className="folder-left" style={{ position: 'relative', zIndex: 2 }}>
                {isActive ? <FolderOpen size={16} /> : <Folder size={16} />}
                <span>{folder.name}</span>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Are you sure you want to delete folder "${folder.name}" and all its logged exam results?`)) {
                    onDeleteFolder(folder.id);
                  }
                }}
                className="folder-delete-btn"
                title="Delete Folder"
                style={{ position: 'relative', zIndex: 2 }}
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          );
        })}

        {folders.length === 0 && !isAdding && (
          <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--text-dark)', fontSize: '13px' }}>
            No folders created yet. Click the + button above to add category folders like 'gate' or 'go'.
          </div>
        )}
      </div>
    </div>
  );
}
