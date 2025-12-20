#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ytdlpPath = path.join(process.cwd(), 'node_modules/youtube-dl-exec/bin/yt-dlp');

if (!fs.existsSync(ytdlpPath)) {
  console.log('yt-dlp binary not found, skipping...');
  process.exit(0);
}

// Find Python 3.10+ available on the system
function findPython() {
  const candidates = [
    '/opt/homebrew/bin/python3.12',  // macOS Homebrew
    '/opt/homebrew/bin/python3.11',
    '/opt/homebrew/bin/python3.10',
    '/usr/local/bin/python3.12',     // Alternative install locations
    '/usr/local/bin/python3.11',
    '/usr/local/bin/python3.10',
    '/usr/bin/python3.12',           // Linux standard paths
    '/usr/bin/python3.11',
    '/usr/bin/python3.10',
    '/usr/bin/python3',              // Default python3 (check version)
  ];

  // Try each candidate
  for (const pyPath of candidates) {
    try {
      if (fs.existsSync(pyPath)) {
        const version = execSync(`${pyPath} --version`, { encoding: 'utf8' });
        const match = version.match(/Python (\d+)\.(\d+)/);
        if (match) {
          const major = parseInt(match[1]);
          const minor = parseInt(match[2]);
          if (major === 3 && minor >= 10) {
            console.log(`✓ Found Python ${major}.${minor} at ${pyPath}`);
            return pyPath;
          }
        }
      }
    } catch (e) {
      // Skip this candidate
    }
  }

  // Check if default python3 works
  try {
    const version = execSync('python3 --version', { encoding: 'utf8' });
    const match = version.match(/Python (\d+)\.(\d+)/);
    if (match) {
      const major = parseInt(match[1]);
      const minor = parseInt(match[2]);
      if (major === 3 && minor >= 10) {
        const pyPath = execSync('which python3', { encoding: 'utf8' }).trim();
        console.log(`✓ Found Python ${major}.${minor} at ${pyPath}`);
        return pyPath;
      }
    }
  } catch (e) {
    // Couldn't find python3
  }

  return null;
}

try {
  const pythonPath = findPython();
  
  if (!pythonPath) {
    console.warn('⚠️  Warning: Could not find Python 3.10+. yt-dlp may not work.');
    console.warn('   Install Python 3.10+ or use a different solution.');
    process.exit(0);
  }

  // Read the current file
  let content = fs.readFileSync(ytdlpPath, 'utf8');
  
  // Replace the shebang line
  const newShebang = `#!${pythonPath}`;
  content = content.replace(/^#!.*$/m, newShebang);
  
  // Write it back
  fs.writeFileSync(ytdlpPath, content, 'utf8');
  
  console.log(`✓ Updated yt-dlp to use: ${pythonPath}`);
} catch (error) {
  console.error('Error fixing yt-dlp:', error.message);
  // Don't fail the build
  process.exit(0);
}
