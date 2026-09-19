import express from 'express';
import Folder from '../models/Folder.js';
import Test from '../models/Test.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/sync - Pull incremental updates since a given timestamp
router.get('/', async (req, res) => {
  try {
    const sinceParam = req.query.since;
    const filter = { userId: req.user.userId };

    if (sinceParam) {
      const sinceDate = new Date(sinceParam);
      if (!isNaN(sinceDate.getTime())) {
        filter.updatedAt = { $gt: sinceDate };
      }
    }

    const folders = await Folder.find(filter);
    const tests = await Test.find(filter);

    return res.json({
      success: true,
      serverTime: new Date().toISOString(),
      folders: folders.map(f => ({
        id: f.id,
        name: f.name,
        color: f.color,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        deletedAt: f.deletedAt
      })),
      tests: tests.map(t => ({
        id: t.id,
        folderId: t.folderId,
        title: t.title,
        date: t.date,
        session: t.session,
        duration: t.duration,
        timeTaken: t.timeTaken,
        timeTakenMinutes: t.timeTakenMinutes,
        marks: t.marks,
        totalMarks: t.totalMarks,
        attempted: t.attempted,
        totalQs: t.totalQs,
        correct: t.correct,
        incorrect: t.incorrect,
        notAttempted: t.notAttempted,
        accuracy: t.accuracy,
        accuracyVal: t.accuracyVal,
        attemptRate: t.attemptRate,
        attemptRateVal: t.attemptRateVal,
        difficulty: t.difficulty,
        gateYear: t.gateYear,
        gateShift: t.gateShift,
        rankGot: t.rankGot,
        totalCandidates: t.totalCandidates,
        notes: t.notes,
        tags: t.tags || [],
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        deletedAt: t.deletedAt
      }))
    });
  } catch (err) {
    console.error('[SYNC GET ERROR]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/sync/push - Push queued offline mutations from clients
router.post('/push', async (req, res) => {
  try {
    const { folders = [], tests = [] } = req.body;
    const now = new Date();
    let processedFolders = 0;
    let processedTests = 0;

    // Process folders
    for (const f of folders) {
      if (!f.id || !f.name) continue;
      await Folder.findOneAndUpdate(
        { userId: req.user.userId, id: f.id },
        {
          $set: {
            name: f.name,
            color: f.color || '#6366f1',
            deletedAt: f.deletedAt ? new Date(f.deletedAt) : null,
            updatedAt: now
          },
          $setOnInsert: {
            createdAt: f.createdAt ? new Date(f.createdAt) : now
          }
        },
        { upsert: true }
      );
      processedFolders++;
    }

    // Process tests
    for (const t of tests) {
      if (!t.id || !t.title || !t.folderId) continue;
      // HARD DEFENSE: Strip paperHtml
      delete t.paperHtml;

      await Test.findOneAndUpdate(
        { userId: req.user.userId, id: t.id },
        {
          $set: {
            folderId: t.folderId,
            title: t.title,
            date: t.date || now.toISOString().split('T')[0],
            session: t.session || null,
            duration: t.duration || '180 Min',
            timeTaken: t.timeTaken || '180 Min',
            timeTakenMinutes: t.timeTakenMinutes || 0,
            marks: typeof t.marks === 'number' ? t.marks : (parseFloat(t.marks) || 0),
            totalMarks: typeof t.totalMarks === 'number' ? t.totalMarks : (parseFloat(t.totalMarks) || 100),
            attempted: parseInt(t.attempted) || 0,
            totalQs: parseInt(t.totalQs) || 65,
            correct: parseInt(t.correct) || 0,
            incorrect: parseInt(t.incorrect) || 0,
            notAttempted: parseInt(t.notAttempted) || 0,
            accuracy: t.accuracy || '0%',
            accuracyVal: t.accuracyVal || 0,
            attemptRate: t.attemptRate || '0%',
            attemptRateVal: t.attemptRateVal || 0,
            difficulty: t.difficulty !== null && t.difficulty !== undefined ? parseFloat(t.difficulty) : null,
            gateYear: t.gateYear || null,
            gateShift: t.gateShift || null,
            rankGot: t.rankGot ? parseInt(t.rankGot) : null,
            totalCandidates: t.totalCandidates ? parseInt(t.totalCandidates) : null,
            notes: (t.notes || '').toString().trim(),
            tags: Array.isArray(t.tags) ? t.tags : [],
            deletedAt: t.deletedAt ? new Date(t.deletedAt) : null,
            updatedAt: now
          },
          $setOnInsert: {
            createdAt: t.createdAt ? new Date(t.createdAt) : now
          }
        },
        { upsert: true }
      );
      processedTests++;
    }

    return res.json({
      success: true,
      serverTime: now.toISOString(),
      processed: {
        folders: processedFolders,
        tests: processedTests
      }
    });
  } catch (err) {
    console.error('[SYNC PUSH ERROR]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
