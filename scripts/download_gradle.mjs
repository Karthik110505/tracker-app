import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

const targetDir = 'C:\\Users\\bvvka\\.gradle\\wrapper\\dists\\gradle-8.14.3-all\\10utluxaxniiv4wxiphsi49nj';
const targetZip = path.join(targetDir, 'gradle-8.14.3-all.zip');
const url = 'https://services.gradle.org/distributions/gradle-8.14.3-all.zip';

async function download() {
  console.log(`Starting download of Gradle 8.14.3...`);
  console.log(`URL: ${url}`);
  console.log(`Target: ${targetZip}`);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Remove stale lock and part files
  const lckFile = path.join(targetDir, 'gradle-8.14.3-all.zip.lck');
  const partFile = path.join(targetDir, 'gradle-8.14.3-all.zip.part');
  if (fs.existsSync(lckFile)) fs.unlinkSync(lckFile);
  if (fs.existsSync(partFile)) fs.unlinkSync(partFile);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const totalBytes = Number(response.headers.get('content-length')) || 0;
  console.log(`Content length: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);

  const fileStream = fs.createWriteStream(targetZip);
  let downloadedBytes = 0;
  let lastLog = Date.now();

  const bodyStream = Readable.fromWeb(response.body);
  bodyStream.on('data', (chunk) => {
    downloadedBytes += chunk.length;
    if (Date.now() - lastLog > 3000) {
      const pct = totalBytes ? ((downloadedBytes / totalBytes) * 100).toFixed(1) : '?';
      console.log(`Downloaded: ${(downloadedBytes / (1024 * 1024)).toFixed(2)} MB (${pct}%)`);
      lastLog = Date.now();
    }
  });

  await finished(bodyStream.pipe(fileStream));

  const stats = fs.statSync(targetZip);
  console.log(`✅ Download complete! File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
}

download().catch(err => {
  console.error('Download failed:', err);
  process.exit(1);
});
