import express from 'express';
import Folder from '../models/Folder.js';
import Test from '../models/Test.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/folders - List all active folders for authenticated user
router.get('/', async (req, res) => {
  try {
    const folders = await Folder.find({
      userId: req.user.userId,
      deletedAt: null
    }).sort({ createdAt: 1 });

    return res.json({
      success: true,
      folders: folders.map(f => ({
        id: f.id,
        name: f.name,
        color: f.color,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt
      }))
    });
  } catch (err) {
    console.error('[FOLDERS GET ERROR]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/folders - Create or restore folder
router.post('/', async (req, res) => {
  try {
    const { id, name, color = '#6366f1' } = req.body;
    if (!id || !name) {
      return res.status(400).json({ success: false, error: 'Folder id and name are required.' });
    }

    const folderId = id.toString().trim();
    const folderName = name.toString().trim();

    const folder = await Folder.findOneAndUpdate(
      { userId: req.user.userId, id: folderId },
      {
        $set: {
          name: folderName,
          color: color.trim(),
          deletedAt: null,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    return res.status(201).json({
      success: true,
      folder: {
        id: folder.id,
        name: folder.name,
        color: folder.color,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt
      }
    });
  } catch (err) {
    console.error('[FOLDERS POST ERROR]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/folders/:id - Update folder
router.put('/:id', async (req, res) => {
  try {
    const folderId = req.params.id;
    const { name, color } = req.body;

    const updateFields = { updatedAt: new Date() };
    if (name) updateFields.name = name.toString().trim();
    if (color) updateFields.color = color.toString().trim();

    const folder = await Folder.findOneAndUpdate(
      { userId: req.user.userId, id: folderId, deletedAt: null },
      { $set: updateFields },
      { new: true }
    );

    if (!folder) {
      return res.status(404).json({ success: false, error: 'Folder not found.' });
    }

    return res.json({
      success: true,
      folder: {
        id: folder.id,
        name: folder.name,
        color: folder.color,
        updatedAt: folder.updatedAt
      }
    });
  } catch (err) {
    console.error('[FOLDERS PUT ERROR]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/folders/:id - Soft-delete folder and associated tests
router.delete('/:id', async (req, res) => {
  try {
    const folderId = req.params.id;
    const now = new Date();

    const folder = await Folder.findOneAndUpdate(
      { userId: req.user.userId, id: folderId },
      { $set: { deletedAt: now, updatedAt: now } },
      { new: true }
    );

    if (!folder) {
      return res.status(404).json({ success: false, error: 'Folder not found.' });
    }

    // Also soft-delete all tests under this folder
    await Test.updateMany(
      { userId: req.user.userId, folderId },
      { $set: { deletedAt: now, updatedAt: now } }
    );

    return res.json({
      success: true,
      message: `Folder '${folder.name}' and its tests deleted.`
    });
  } catch (err) {
    console.error('[FOLDERS DELETE ERROR]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
