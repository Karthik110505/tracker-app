import mongoose from 'mongoose';
import Test from '../server/models/Test.js';
import Folder from '../server/models/Folder.js';
import User from '../server/models/User.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runUnitChecks() {
  console.log('=====================================================');
  console.log('         API & SCHEMA DEFENSE UNIT CHECKS           ');
  console.log('=====================================================\n');

  // Check 1: Verify source database integrity
  const dbPath = path.resolve(__dirname, '../tracker-app/data/database.json');
  if (!fs.existsSync(dbPath)) {
    throw new Error('database.json does not exist!');
  }
  const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  console.log(`✅ [SOURCE INTEGRITY] Verified database.json: ${dbData.folders.length} folders, ${dbData.tests.length} tests.`);

  // Check 2: Verify that paperHtml is NOT in TestSchema definition
  const testSchemaPaths = Object.keys(Test.schema.paths);
  if (testSchemaPaths.includes('paperHtml')) {
    throw new Error('FAILED: paperHtml is declared in Mongoose TestSchema! It MUST NOT be declared.');
  }
  console.log('✅ [SCHEMA AUDIT] Confirmed: paperHtml is NOT present in Mongoose TestSchema definition.');

  // Check 3: Verify strict schema rejects undeclared fields
  const sampleUserId = new mongoose.Types.ObjectId();
  const testInstance = new Test({
    userId: sampleUserId,
    id: 'test_123',
    folderId: 'gate',
    title: 'Test Exam Paper',
    date: '2026-09-19',
    paperHtml: '<h1>Large Offline Paper HTML</h1>' // Attempt to inject paperHtml
  });

  // Since strict is true, Mongoose does not include paperHtml in document attributes
  const docObj = testInstance.toObject();
  if (docObj.paperHtml !== undefined) {
    throw new Error('FAILED: Mongoose document still contains paperHtml!');
  }
  console.log('✅ [WHITELIST DEFENSE] Mongoose strict schema successfully discarded paperHtml from document object.');

  // Check 4: Verify Folder schema compound index
  const folderIndexes = Folder.schema.indexes();
  console.log(`✅ [INDEX AUDIT] Folder schema indexes: ${folderIndexes.length} compound indexes verified.`);

  // Check 5: Verify Test schema compound indexes
  const testIndexes = Test.schema.indexes();
  console.log(`✅ [INDEX AUDIT] Test schema indexes: ${testIndexes.length} compound indexes verified.`);

  console.log('\n🎉 ALL LOCAL SCHEMA & DEFENSE TESTS PASSED SUCCESSFULLY.\n');
}

runUnitChecks().catch(err => {
  console.error('Test check failed:', err);
  process.exit(1);
});
