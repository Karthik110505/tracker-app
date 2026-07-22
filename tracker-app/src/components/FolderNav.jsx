import React, { useState } from 'react';
import { Folder, FolderOpen, Plus, Trash2, X, Check, LayoutDashboard } from 'lucide-react';

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
    <div class="folder-nav">
      {/* Permanent General Dashboard Tab */}
      <div 
        onClick={() => onSelectFolder(null)}
        class={`folder-item ${activeFolderId === null ? 'active' : ''}`}
        style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-card)', borderRadius: '8px', paddingBottom: '12px' }}
      >
        <div class="folder-left">
          <LayoutDashboard size={16} />
          <span style={{ fontWeight: '600' }}>General Dashboard</span>
        </div>
      </div>

      <div class="folder-nav-header">
        <h3>Categories</h3>
        <button 
          onClick={() => setIsAdding(!isAdding)} 
          class="btn-add-folder"
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
              class="form-input"
              style={{ padding: '6px 10px', fontSize: '13px' }}
            />
            <button 
              type="submit" 
              class="btn btn-primary" 
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
            <div 
              key={folder.id}
              onClick={() => onSelectFolder(folder.id)}
              class={`folder-item ${isActive ? 'active' : ''}`}
            >
              <div class="folder-left">
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
                class="folder-delete-btn"
                title="Delete Folder"
              >
                <Trash2 size={14} />
              </button>
            </div>
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
