import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

import bcrypt from 'bcryptjs';

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
  const user = await User.findOne({ username: 'karthik' });
  console.log('User:', user?.username, 'has passwordHash:', !!user?.passwordHash);
  if (user) {
    const test1 = await bcrypt.compare('Karthik@1155', user.passwordHash);
    console.log('Comparison with Karthik@1155:', test1);
    if (!test1) {
      // If the password hash was initialized with something else or corrupted, reset it
      console.log('Resetting passwordHash for karthik to Karthik@1155...');
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash('Karthik@1155', salt);
      await user.save();
      console.log('Password successfully reset to Karthik@1155!');
    }
  }
  await mongoose.disconnect();
}

inspect().catch(console.error);
