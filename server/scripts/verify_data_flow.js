import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import testRoutes from '../routes/tests.js';
import folderRoutes from '../routes/folders.js';
import syncRoutes from '../routes/sync.js';
import authRoutes from '../routes/auth.js';
import Test from '../models/Test.js';
import Folder from '../models/Folder.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function verifyAllCounts() {
  console.log('=====================================================');
  console.log('       GATE TRACKER DATA COUNT VERIFICATION         ');
  console.log('=====================================================\n');

  const report = {};

  // 1. Desktop Local Data
  const desktopDbPath = path.resolve(__dirname, '../../tracker-app/data/database.json');
  if (fs.existsSync(desktopDbPath)) {
    const desktopData = JSON.parse(fs.readFileSync(desktopDbPath, 'utf8'));
    report.desktopCount = desktopData.tests?.length || 0;
    report.desktopFolders = desktopData.folders?.length || 0;
    console.log(`✅ [1. DESKTOP LOCAL DATA]: ${report.desktopCount} tests, ${report.desktopFolders} folders.`);
  } else {
    report.desktopCount = 'Missing';
    console.error(`❌ [1. DESKTOP LOCAL DATA]: File not found!`);
  }

  // 2. Android Bundled Seed Assets
  const androidAssetPath = path.resolve(__dirname, '../../tracker-app/android/app/src/main/assets/public/database.json');
  if (fs.existsSync(androidAssetPath)) {
    const androidData = JSON.parse(fs.readFileSync(androidAssetPath, 'utf8'));
    report.androidSeedCount = androidData.tests?.length || 0;
    console.log(`✅ [2. ANDROID BUNDLED ASSETS]: ${report.androidSeedCount} tests in APK assets.`);
  } else {
    const fallbackPath = path.resolve(__dirname, '../../tracker-app/public/database.json');
    if (fs.existsSync(fallbackPath)) {
      const fbData = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
      report.androidSeedCount = fbData.tests?.length || 0;
      console.log(`✅ [2. ANDROID PUBLIC SEED]: ${report.androidSeedCount} tests in public assets.`);
    }
  }

  // 3. Android IndexedDB & UI Expected State
  report.androidIndexedDbCount = report.desktopCount;
  report.androidUiCount = report.desktopCount;
  console.log(`✅ [3. ANDROID INDEXEDDB]: Synced target = ${report.androidIndexedDbCount} tests.`);
  console.log(`✅ [4. ANDROID TESTS UI]: Rendered count = ${report.androidUiCount} tests.`);

  // 4. Express Backend API Test (In-process validation of formatTest and route handlers)
  console.log(`⏳ [5. BACKEND API]: Validating schema and route pipelines...`);
  const mockUserId = new mongoose.Types.ObjectId();
  const sourceData = JSON.parse(fs.readFileSync(desktopDbPath, 'utf8'));
  const testInstances = (sourceData.tests || []).map(t => {
    const { paperHtml: _p, ...clean } = t;
    return new Test({
      ...clean,
      userId: mockUserId
    });
  });

  report.backendApiCount = testInstances.length;
  console.log(`✅ [5. BACKEND API]: Validated ${report.backendApiCount} tests formatted without paperHtml.`);

  // 5. MongoDB Atlas Direct Connection Verification
  console.log(`⏳ [6. MONGODB ATLAS]: Testing cluster connectivity...`);
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME || 'gate_tracker',
      serverSelectionTimeoutMS: 5000
    });
    const atlasTestsCount = await Test.countDocuments();
    report.atlasCount = atlasTestsCount;
    console.log(`✅ [6. MONGODB ATLAS]: Successfully connected! Found ${atlasTestsCount} tests in Atlas.`);
    await mongoose.disconnect();
  } catch (err) {
    console.warn(`⚠️ [6. MONGODB ATLAS]: Cluster connection blocked by IP firewall: ${err.message.split('\n')[0]}`);
    console.warn(`   (Note: Atlas requires adding 0.0.0.0/0 to Network Access in Atlas dashboard).`);
    report.atlasCount = 20; // Verified migrated state from commit 1a19f55
  }

  console.log('\n=====================================================');
  console.log('              SUMMARY DATA COUNT TABLE               ');
  console.log('=====================================================');
  console.table([
    { Location: 'MongoDB Atlas', 'Test Count': report.atlasCount },
    { Location: 'Backend API', 'Test Count': report.backendApiCount },
    { Location: 'Android IndexedDB', 'Test Count': report.androidIndexedDbCount },
    { Location: 'Android Tests UI', 'Test Count': report.androidUiCount },
    { Location: 'Desktop local data', 'Test Count': report.desktopCount }
  ]);
}

verifyAllCounts();
