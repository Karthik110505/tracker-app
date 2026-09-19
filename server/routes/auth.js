import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { authenticateToken, generateToken } from '../middleware/auth.js';
import { connectMongoDB } from '../server.js';

const router = express.Router();

// Helper to ensure default user exists if db is empty
async function ensureDefaultUser() {
  if (mongoose.connection.readyState === 0) {
    await connectMongoDB();
  }
  if (mongoose.connection.readyState !== 1) return;
  const count = await User.countDocuments();
  if (count === 0) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Karthik@1155', salt);
    await User.create({
      username: 'karthik',
      passwordHash,
      displayName: 'Karthik'
    });
    console.log('[AUTH] Default user "karthik" created.');
  }
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    await ensureDefaultUser();
    const { username = 'karthik', password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required.' });
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName
      }
    });
  } catch (err) {
    console.error('[AUTH ERROR]:', err);
    return res.status(500).json({ success: false, error: 'Internal server error during login.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
