import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env
const serverEnvPath = path.resolve(__dirname, '../server/.env');
if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
} else {
  dotenv.config();
}

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'gate_tracker';
const SOURCE_DB_PATH = path.resolve(__dirname, '../tracker-app/data/database.json');
const BACKUP_DB_PATH = path.resolve(__dirname, '../tracker-app/data/database.backup.json');

// Define schemas inline or import from server models
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  displayName: { type: String, default: 'Karthik' }
}, { timestamps: true });

const FolderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  id: { type: String, required: true },
  name: { type: String, required: true },
  color: { type: String, default: '#6366f1' },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });
FolderSchema.index({ userId: 1, id: 1 }, { unique: true });

const TestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  id: { type: String, required: true },
  folderId: { type: String, required: true },
  title: { type: String, required: true },
  date: { type: String, required: true },
  session: { type: String, default: null },
  duration: { type: String, default: '180 Min' },
  timeTaken: { type: String, default: '180 Min' },
  timeTakenMinutes: { type: Number, default: 0 },
  marks: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 100 },
  attempted: { type: Number, default: 0 },
  totalQs: { type: Number, default: 65 },
  correct: { type: Number, default: 0 },
  incorrect: { type: Number, default: 0 },
  notAttempted: { type: Number, default: 0 },
  accuracy: { type: String, default: '0%' },
  accuracyVal: { type: Number, default: 0 },
  attemptRate: { type: String, default: '0%' },
  attemptRateVal: { type: Number, default: 0 },
  difficulty: { type: Number, default: null },
  gateYear: { type: String, default: null },
  gateShift: { type: String, default: null },
  rankGot: { type: Number, default: null },
  totalCandidates: { type: Number, default: null },
  notes: { type: String, default: '' },
  tags: [{ type: String }],
  deletedAt: { type: Date, default: null }
}, { timestamps: true, strict: true });
TestSchema.index({ userId: 1, id: 1 }, { unique: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Folder = mongoose.models.Folder || mongoose.model('Folder', FolderSchema);
const Test = mongoose.models.Test || mongoose.model('Test', TestSchema);

async function runMigration() {
  console.log('=====================================================');
  console.log('   GATE REVISION TRACKER - MONGODB ATLAS MIGRATION   ');
  console.log('=====================================================\n');

  // 1. Verify connection string
  if (!MONGODB_URI || MONGODB_URI.includes('<db_password>')) {
    console.error('❌ MONGODB_URI is not set or still contains <db_password> placeholder in server/.env.');
    console.error('Please configure your database password in server/.env before running migration.');
    process.exit(1);
  }

  // 2. Step 1: Backup local database
  if (!fs.existsSync(SOURCE_DB_PATH)) {
    console.error(`❌ Source database file not found at: ${SOURCE_DB_PATH}`);
    process.exit(1);
  }
  fs.copyFileSync(SOURCE_DB_PATH, BACKUP_DB_PATH);
  console.log(`✅ [BACKUP] Created safety backup at: ${BACKUP_DB_PATH}`);

  // 3. Step 2 & 3: Read current folders and tests
  const rawData = fs.readFileSync(SOURCE_DB_PATH, 'utf8');
  const sourceDb = JSON.parse(rawData);
  const sourceFolders = sourceDb.folders || [];
  const sourceTests = sourceDb.tests || [];

  console.log(`📊 [SOURCE] Found ${sourceFolders.length} folders and ${sourceTests.length} tests in source database.`);

  // 4. Connect to MongoDB Atlas
  console.log(`⏳ Connecting to MongoDB Atlas cluster at host: ${MONGODB_URI.split('@')[1]?.split('?')[0]}...`);
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });
  console.log(`✅ Connected to database: ${MONGODB_DB_NAME}\n`);

  // 5. Ensure default user exists
  let user = await User.findOne({ username: 'karthik' });
  if (!user) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Karthik@1155', salt);
    user = await User.create({
      username: 'karthik',
      passwordHash,
      displayName: 'Karthik'
    });
    console.log(`👤 Created user: ${user.username} (ID: ${user._id})`);
  } else {
    console.log(`👤 Authenticated user: ${user.username} (ID: ${user._id})`);
  }

  // 6. Upload folders
  let foldersUploaded = 0;
  for (const f of sourceFolders) {
    await Folder.findOneAndUpdate(
      { userId: user._id, id: f.id },
      {
        $set: {
          name: f.name,
          color: f.color || '#6366f1',
          deletedAt: null,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    foldersUploaded++;
  }
  console.log(`📁 [FOLDERS] Successfully migrated ${foldersUploaded} folders.`);

  // 7. Step 4, 5, 6, 7: Validate records, remove paperHtml, detect duplicates, upload tests
  let successful = 0;
  let skipped = 0;
  let duplicates = 0;
  let failed = 0;
  let htmlUploadedCount = 0;

  const seenIds = new Set();

  for (const t of sourceTests) {
    try {
      if (!t.id || !t.title) {
        skipped++;
        continue;
      }

      if (seenIds.has(t.id)) {
        duplicates++;
      }
      seenIds.add(t.id);

      // STEP 5: ABSOLUTE REMOVAL OF paperHtml
      const sanitized = { ...t };
      if (sanitized.paperHtml !== undefined) {
        delete sanitized.paperHtml;
      }

      // Hard assertion: zero paperHtml
      if ('paperHtml' in sanitized) {
        htmlUploadedCount++;
        throw new Error(`CRITICAL: paperHtml was not stripped from test id ${t.id}!`);
      }

      // Parse numerical fields safely
      const marks = typeof sanitized.marks === 'number' ? sanitized.marks : (parseFloat(sanitized.marks) || 0);
      const totalMarks = typeof sanitized.totalMarks === 'number' ? sanitized.totalMarks : (parseFloat(sanitized.totalMarks) || 100);
      const attempted = parseInt(sanitized.attempted) || 0;
      const totalQs = parseInt(sanitized.totalQs) || 65;
      const correct = parseInt(sanitized.correct) || 0;
      const incorrect = parseInt(sanitized.incorrect) || 0;
      const notAttempted = sanitized.notAttempted !== undefined ? (parseInt(sanitized.notAttempted) || 0) : Math.max(0, totalQs - attempted);

      let accuracyVal = 0;
      if (sanitized.accuracy) {
        accuracyVal = parseFloat(sanitized.accuracy.replace('%', '')) || 0;
      } else if (attempted > 0) {
        accuracyVal = parseFloat(((correct / attempted) * 100).toFixed(1));
      }

      let attemptRateVal = 0;
      if (totalQs > 0) {
        attemptRateVal = parseFloat(((attempted / totalQs) * 100).toFixed(1));
      }

      let timeTakenMinutes = 0;
      if (sanitized.timeTaken) {
        const match = sanitized.timeTaken.toString().match(/([\d.]+)/);
        if (match) timeTakenMinutes = parseFloat(match[1]);
      }

      const gateYear = sanitized.title.match(/\b(20\d{2})\b/)?.[1] || null;
      const shiftMatch = sanitized.title.match(/(?:set|shift|session)\s*([1-3])/i);
      const gateShift = shiftMatch ? `Set ${shiftMatch[1]}` : (sanitized.title.toUpperCase().includes('GATE') ? 'Single' : null);

      await Test.findOneAndUpdate(
        { userId: user._id, id: sanitized.id },
        {
          $set: {
            folderId: sanitized.folderId || 'gate',
            title: sanitized.title.trim(),
            date: sanitized.date || new Date().toISOString().split('T')[0],
            session: sanitized.session || null,
            duration: sanitized.duration || '180 Min',
            timeTaken: sanitized.timeTaken || '180 Min',
            timeTakenMinutes,
            marks,
            totalMarks,
            attempted,
            totalQs,
            correct,
            incorrect,
            notAttempted,
            accuracy: sanitized.accuracy || `${Math.round(accuracyVal)}%`,
            accuracyVal,
            attemptRate: `${attemptRateVal}%`,
            attemptRateVal,
            difficulty: sanitized.difficulty !== null && sanitized.difficulty !== undefined ? parseFloat(sanitized.difficulty) : null,
            gateYear,
            gateShift,
            rankGot: sanitized.rankGot ? parseInt(sanitized.rankGot) : null,
            totalCandidates: sanitized.totalCandidates ? parseInt(sanitized.totalCandidates) : null,
            notes: (sanitized.notes || '').toString().trim(),
            tags: Array.isArray(sanitized.tags) ? sanitized.tags : [],
            deletedAt: null,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true, runValidators: true }
      );

      successful++;
    } catch (err) {
      console.error(`❌ Error migrating test "${t.title}":`, err.message);
      failed++;
    }
  }

  // 8. Step 10 & 11: Query MongoDB again and compare source vs destination
  const destFolders = await Folder.countDocuments({ userId: user._id, deletedAt: null });
  const destTests = await Test.countDocuments({ userId: user._id, deletedAt: null });
  const htmlCheckCount = await Test.countDocuments({ userId: user._id, paperHtml: { $exists: true } });

  // 9. Step 13: Verify representative record
  const sampleTest = await Test.findOne({ userId: user._id, id: '1784718601555' });
  if (sampleTest) {
    console.log(`\n🔍 [VERIFICATION] Representative Record Checked: "${sampleTest.title}"`);
    console.log(`   Marks: ${sampleTest.marks} / ${sampleTest.totalMarks} | Accuracy: ${sampleTest.accuracy} | Time: ${sampleTest.timeTaken}`);
    console.log(`   Has paperHtml property: ${sampleTest.paperHtml !== undefined ? 'YES (VIOLATION)' : 'NO (CORRECT)'}`);
  }

  // 10. Generate formal Migration Report
  console.log('\n=====================================================');
  console.log('                  MIGRATION REPORT                   ');
  console.log('=====================================================\n');
  console.log('SOURCE');
  console.log(`Folders: ${sourceFolders.length}`);
  console.log(`Tests:   ${sourceTests.length}\n`);

  console.log('MONGODB');
  console.log(`Folders: ${destFolders}`);
  console.log(`Tests:   ${destTests}\n`);

  console.log('MIGRATION');
  console.log(`Successful: ${successful}`);
  console.log(`Skipped:    ${skipped}`);
  console.log(`Duplicates: ${duplicates}`);
  console.log(`Failed:     ${failed}\n`);

  console.log('HTML records uploaded:');
  console.log(`${htmlCheckCount}\n`);

  if (htmlCheckCount === 0 && destTests === sourceTests.length && destFolders === sourceFolders.length) {
    console.log('🎉 STATUS: MIGRATION 100% SUCCESSFUL & ZERO HTML UPLOAD VERIFIED.');
  } else {
    console.warn('⚠️ STATUS: MIGRATION FINISHED WITH DISCREPANCIES. PLEASE REVIEW LOGS.');
  }

  await mongoose.disconnect();
  console.log('Disconnected from database.');
}

runMigration().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
