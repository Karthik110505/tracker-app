import fs from 'fs';
import path from 'path';
import { DOMParser } from 'linkedom';

global.DOMParser = DOMParser;
import { parseOfflineHtml } from './src/utils/htmlParser.js';

const pyqDir = 'E:\\GATE\\TEST_RESULTS\\GATE_PYQ';
const goDir = 'E:\\GATE\\TEST_RESULTS\\GO\\TWT';
const nptelDir = 'E:\\GATE\\TEST_RESULTS\\NPTEL';

const existingDbPath = './data/database.json';
let existingDb = { folders: [], tests: [] };
if (fs.existsSync(existingDbPath)) {
  try {
    existingDb = JSON.parse(fs.readFileSync(existingDbPath, 'utf8'));
  } catch(e) {}
}

const folders = [
  { id: 'gate', name: 'GATE', color: '#6366f1' },
  { id: 'go_classes', name: 'GO Classes', color: '#10b981' },
  { id: 'nptel', name: 'NPTEL', color: '#f59e0b' }
];

const allTests = [];

// 1. Process GATE PYQs
const pyqFiles = [
  { file: 'GATE_CSE_2010___Original_Paper_Offline.html', year: '2010', shift: 'Single', id: '1784718601555' },
  { file: 'GATE_CSE_2011___Original_Paper_Offline.html', year: '2011', shift: 'Single', id: '1784718601556' },
  { file: 'GATE_Exam_Page_Offline_2012.html', year: '2012', shift: 'Single', id: '1784718601557' },
  { file: 'GATE_Exam_Page_Offline_2013.html', year: '2013', shift: 'Single', id: '1784718601558' },
  { file: 'GATE_Exam_Page_Offline_2014_shift_1.html', year: '2014', shift: 'Set 1', id: '1784718601559' },
  { file: 'GATE_Exam_Page_Offline_2014_shift_2.html', year: '2014', shift: 'Set 2', id: '1784718601560' },
  { file: 'GATE_Exam_Page_Offline_2014_shift_3.html', year: '2014', shift: 'Set 3', id: '1784718601561' },
  { file: 'GATE_Exam_Page_Offline_2015_shift_1.html', year: '2015', shift: 'Set 1', id: '1784718601562' },
  { file: 'GATE_Exam_Page_Offline_2015_shift_2.html', year: '2015', shift: 'Set 2', id: '1784718601563' },
  { file: 'GATE_Exam_Page_Offline_2015_shift_3.html', year: '2015', shift: 'Set 3', id: '1784718601564' },
  { file: 'GATE_Exam_Page_Offline_2016_shift_1.html', year: '2016', shift: 'Set 1', id: '1784718601565' },
  { file: 'GATE_Exam_Page_Offline_2016_shift_2.html', year: '2016', shift: 'Set 2', id: '1784718601566' },
  { file: 'GATE_Exam_Page_Offline_2017_shift_1.html', year: '2017', shift: 'Set 1', id: '1784718601567' },
  { file: 'GATE_Exam_Page_Offline_2017_shift_2.html', year: '2017', shift: 'Set 2', id: '1784718601568' },
  { file: 'GATE_Exam_Page_Offline_2018.html', year: '2018', shift: 'Single', id: '1784718601569' },
  { file: 'GATE_Exam_Page_Offline_2019.html', year: '2019', shift: 'Single', id: '1784718601570' },
  { file: 'GATE_Exam_Page_Offline_2020.html', year: '2020', shift: 'Single', id: '1784718601571' }
];

console.log('Compiling 17 GATE PYQ tests...');
for (const item of pyqFiles) {
  const filePath = path.join(pyqDir, item.file);
  if (!fs.existsSync(filePath)) {
    console.warn('Missing file:', filePath);
    continue;
  }
  const stat = fs.statSync(filePath);
  const dateStr = stat.mtime.toISOString().split('T')[0];
  const html = fs.readFileSync(filePath, 'utf8');
  
  const parsed = parseOfflineHtml(html, 'auto');
  
  const setPart = (item.shift && item.shift !== 'Single') ? ` | ${item.shift}` : '';
  const title = `GATE CSE ${item.year}${setPart} | Original Paper`;
  
  allTests.push({
    id: item.id,
    folderId: 'gate',
    title: title,
    date: dateStr,
    marks: parsed.marks,
    totalMarks: parsed.totalMarks || 100,
    attempted: parsed.attempted,
    totalQs: parsed.totalQs || 65,
    correct: parsed.correct,
    incorrect: parsed.incorrect,
    notAttempted: parsed.notAttempted,
    duration: parsed.duration || '180 Min',
    timeTaken: parsed.timeTaken || '',
    accuracy: parsed.accuracy,
    notes: '',
    tags: [],
    difficulty: parsed.difficulty !== null && parsed.difficulty !== undefined ? parsed.difficulty.toString() : '',
    session: parsed.session || '',
    paperHtml: html
  });
  console.log(`✓ Added: ${title} (${dateStr}) - ${parsed.marks}/${parsed.totalMarks} marks`);
}

// 2. Process GO Classes Tests
const goFiles = [
  { file: 'GO_Classes_CS_Test_Series___Algorithms___Topic_Wise_Test_1_Offline.html', id: '1784718601580' },
  { file: 'GO_Classes_CS_Test_Series___Algorithms___Topic_Wise_Test_2_Offline.html', id: '1784718601581' }
];

console.log('\nCompiling GO Classes tests...');
for (const item of goFiles) {
  const filePath = path.join(goDir, item.file);
  if (!fs.existsSync(filePath)) continue;
  const stat = fs.statSync(filePath);
  const dateStr = stat.mtime.toISOString().split('T')[0];
  const html = fs.readFileSync(filePath, 'utf8');
  const parsed = parseOfflineHtml(html, 'auto');
  
  allTests.push({
    id: item.id,
    folderId: 'go_classes',
    title: parsed.title,
    date: dateStr,
    marks: parsed.marks,
    totalMarks: parsed.totalMarks,
    attempted: parsed.attempted,
    totalQs: parsed.totalQs,
    correct: parsed.correct,
    incorrect: parsed.incorrect,
    notAttempted: parsed.notAttempted,
    duration: parsed.duration || '45 Min',
    timeTaken: parsed.timeTaken || '',
    accuracy: parsed.accuracy,
    notes: '',
    tags: ['Algorithms', 'Topic Wise'],
    difficulty: '',
    session: '',
    paperHtml: html
  });
  console.log(`✓ Added: ${parsed.title} (${dateStr}) - ${parsed.marks}/${parsed.totalMarks} marks`);
}

// 3. Process NPTEL Test
const nptelFile = path.join(nptelDir, 'Mock_Test_-_16_08_2026_-_NPTEL_NPTEL_Results.html');
if (fs.existsSync(nptelFile)) {
  console.log('\nCompiling NPTEL test...');
  const stat = fs.statSync(nptelFile);
  const dateStr = stat.mtime.toISOString().split('T')[0];
  const html = fs.readFileSync(nptelFile, 'utf8');
  const parsed = parseOfflineHtml(html, 'auto');
  
  allTests.push({
    id: '1784718601590',
    folderId: 'nptel',
    title: parsed.title,
    date: dateStr,
    marks: parsed.marks,
    totalMarks: parsed.totalMarks,
    attempted: parsed.attempted,
    totalQs: parsed.totalQs,
    correct: parsed.correct,
    incorrect: parsed.incorrect,
    notAttempted: parsed.notAttempted,
    duration: parsed.duration || '180 Min',
    timeTaken: parsed.timeTaken || '',
    accuracy: parsed.accuracy,
    notes: '',
    tags: ['NPTEL', 'Mock Test'],
    difficulty: '',
    session: '',
    paperHtml: html
  });
  console.log(`✓ Added: ${parsed.title} (${dateStr}) - ${parsed.marks}/${parsed.totalMarks} marks`);
}

// Sort all tests chronologically by date
allTests.sort((a, b) => new Date(a.date) - new Date(b.date));

const finalDb = {
  folders,
  tests: allTests
};

fs.writeFileSync(existingDbPath, JSON.stringify(finalDb, null, 2), 'utf8');
console.log(`\nSUCCESS: database.json written with ${folders.length} folders and ${allTests.length} tests!`);
console.log(`File size: ${(fs.statSync(existingDbPath).size / 1024 / 1024).toFixed(2)} MB`);
