import express from 'express';
import Test from '../models/Test.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Helper to sanitize test document for client response
function formatTest(t) {
  return {
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
    updatedAt: t.updatedAt
  };
}

// GET /api/tests - Retrieve all tests (optionally filtered by folderId)
router.get('/', async (req, res) => {
  try {
    const query = {
      userId: req.user.userId,
      deletedAt: null
    };

    if (req.query.folderId) {
      query.folderId = req.query.folderId;
    }

    const tests = await Test.find(query).sort({ date: -1, createdAt: -1 });

    return res.json({
      success: true,
      count: tests.length,
      tests: tests.map(formatTest)
    });
  } catch (err) {
    console.error('[TESTS GET ERROR]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/tests/:id - Retrieve single test by app id
router.get('/:id', async (req, res) => {
  try {
    const test = await Test.findOne({
      userId: req.user.userId,
      id: req.params.id,
      deletedAt: null
    });

    if (!test) {
      return res.status(404).json({ success: false, error: 'Test record not found.' });
    }

    return res.json({
      success: true,
      test: formatTest(test)
    });
  } catch (err) {
    console.error('[TESTS GET ONE ERROR]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tests - Create or upsert a test record
router.post('/', async (req, res) => {
  try {
    // LAYER 2 DEFENSE: Actively delete paperHtml from payload if sent
    if (req.body && req.body.paperHtml !== undefined) {
      delete req.body.paperHtml;
    }

    const data = req.body;
    if (!data.id || !data.title || !data.folderId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: id, title, and folderId are mandatory.'
      });
    }

    const testId = data.id.toString().trim();
    const marks = typeof data.marks === 'number' ? data.marks : (parseFloat(data.marks) || 0);
    const totalMarks = typeof data.totalMarks === 'number' ? data.totalMarks : (parseFloat(data.totalMarks) || 100);
    const attempted = parseInt(data.attempted) || 0;
    const totalQs = parseInt(data.totalQs) || 65;
    const correct = parseInt(data.correct) || 0;
    const incorrect = parseInt(data.incorrect) || 0;
    const notAttempted = data.notAttempted !== undefined ? (parseInt(data.notAttempted) || 0) : Math.max(0, totalQs - attempted);

    // Compute accuracy percentage
    let accuracyStr = data.accuracy || '0%';
    let accuracyVal = 0;
    if (attempted > 0) {
      accuracyVal = parseFloat(((correct / attempted) * 100).toFixed(1));
      if (!data.accuracy) accuracyStr = `${Math.round(accuracyVal)}%`;
    }

    // Compute attempt rate
    let attemptRateVal = 0;
    let attemptRateStr = data.attemptRate || '0%';
    if (totalQs > 0) {
      attemptRateVal = parseFloat(((attempted / totalQs) * 100).toFixed(1));
      attemptRateStr = `${Math.round(attemptRateVal)}%`;
    }

    // Parse timeTaken into numerical minutes if possible
    let timeTakenMinutes = 0;
    if (data.timeTaken) {
      const match = data.timeTaken.toString().match(/([\d.]+)/);
      if (match) timeTakenMinutes = parseFloat(match[1]);
    }

    let difficulty = null;
    if (data.difficulty !== null && data.difficulty !== undefined && String(data.difficulty).trim() !== '') {
      const parsedDiff = parseFloat(data.difficulty);
      if (!isNaN(parsedDiff)) difficulty = parsedDiff;
    }

    const testDoc = await Test.findOneAndUpdate(
      { userId: req.user.userId, id: testId },
      {
        $set: {
          folderId: data.folderId.toString().trim(),
          title: data.title.toString().trim(),
          date: data.date || new Date().toISOString().split('T')[0],
          session: data.session || null,
          duration: data.duration || '180 Min',
          timeTaken: data.timeTaken || '180 Min',
          timeTakenMinutes,
          marks,
          totalMarks,
          attempted,
          totalQs,
          correct,
          incorrect,
          notAttempted,
          accuracy: accuracyStr,
          accuracyVal,
          attemptRate: attemptRateStr,
          attemptRateVal,
          difficulty,
          gateYear: data.gateYear || null,
          gateShift: data.gateShift || null,
          rankGot: data.rankGot ? parseInt(data.rankGot) : null,
          totalCandidates: data.totalCandidates ? parseInt(data.totalCandidates) : null,
          notes: (data.notes || '').toString().trim(),
          tags: Array.isArray(data.tags) ? data.tags : (typeof data.tags === 'string' ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
          deletedAt: null,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true, new: true, runValidators: true }
    );

    return res.status(201).json({
      success: true,
      test: formatTest(testDoc)
    });
  } catch (err) {
    console.error('[TESTS POST ERROR]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/tests/:id - Update specific fields of a test record
router.put('/:id', async (req, res) => {
  try {
    if (req.body && req.body.paperHtml !== undefined) {
      delete req.body.paperHtml;
    }

    const testId = req.params.id;
    const allowedUpdates = [
      'title', 'folderId', 'date', 'session', 'duration', 'timeTaken',
      'marks', 'totalMarks', 'attempted', 'totalQs', 'correct', 'incorrect',
      'notAttempted', 'accuracy', 'difficulty', 'gateYear', 'gateShift',
      'rankGot', 'totalCandidates', 'notes', 'tags'
    ];

    const updates = { updatedAt: new Date() };
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const testDoc = await Test.findOneAndUpdate(
      { userId: req.user.userId, id: testId, deletedAt: null },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!testDoc) {
      return res.status(404).json({ success: false, error: 'Test record not found.' });
    }

    return res.json({
      success: true,
      test: formatTest(testDoc)
    });
  } catch (err) {
    console.error('[TESTS PUT ERROR]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/tests/:id - Soft-delete test record
router.delete('/:id', async (req, res) => {
  try {
    const testId = req.params.id;
    const now = new Date();

    const testDoc = await Test.findOneAndUpdate(
      { userId: req.user.userId, id: testId },
      { $set: { deletedAt: now, updatedAt: now } },
      { new: true }
    );

    if (!testDoc) {
      return res.status(404).json({ success: false, error: 'Test record not found.' });
    }

    return res.json({
      success: true,
      message: `Test '${testDoc.title}' soft-deleted.`
    });
  } catch (err) {
    console.error('[TESTS DELETE ERROR]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
