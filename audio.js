const youtubedl = require('youtube-dl-exec');
const fs = require('fs').promises;
const path = require('path');

// Use environment variable for temp directory with fallback
//const tempDir = process.env.TEMP_DIR || process.env.TMPDIR || '/tmp';
const downloadDir = path.join(process.cwd(), 'temp_audio');

// Add more detailed logging with timestamp
const log = (message, data = '') => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}][YouTube Downloader] ${message}`, data);
};

// Extract video ID from the YouTube URL
function extractVideoId(videoUrl) {
  const match = videoUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  return match ? match[1] : null;
}

// Ensure the download directory exists
async function ensureDownloadDir() {
  try {
    await fs.access(downloadDir);
    log(`Download directory exists: ${downloadDir}`);
  } catch (error) {
    log(`Creating download directory: ${downloadDir}`);
    await fs.mkdir(downloadDir, { recursive: true });
  }
}

// Cleanup old files (older than 1 hour)
async function cleanupOldFiles() {
  try {
    const files = await fs.readdir(downloadDir);
    const currentTime = Date.now();

    await Promise.all(
      files.map(async (file) => {
        try {
          const filePath = path.join(downloadDir, file);
          const stats = await fs.stat(filePath);

          // Remove files older than 1 hour
          if (currentTime - stats.mtimeMs > 3600000) {
            await fs.unlink(filePath);
            log(`Cleaned up old file: ${file}`);
          }
        } catch (fileError) {
          log(`Error cleaning file ${file}:`, fileError.message);
        }
      })
    );
  } catch (error) {
    log('Error during cleanup:', error.message);
  }
}

// Retry download function
async function retryDownload(videoUrl, options, retries = 3, delay = 2000) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      log(`Attempt ${attempt + 1} to download: ${videoUrl}`);
      await youtubedl(videoUrl, options);
      return; // Exit on successful download
    } catch (downloadError) {
      log(`Download attempt ${attempt + 1} failed: ${downloadError.message}`);
      if (attempt < retries - 1) {
        log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw new Error('Maximum retries reached. Download failed.');
      }
    }
  }
}

// Verify if a file exists and is readable with retries
async function waitForFile(filePath, retries = 3, delay = 1000) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await fs.access(filePath, fs.constants.R_OK);
      return true;
    } catch {
      if (attempt < retries - 1) {
        log(`File not found, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw new Error('File verification failed after multiple attempts');
      }
    }
  }
}

// Main download function
async function downloadAudio(videoUrl) {
  let audioFile;

  try {
    // Ensure directory exists and clean old files
    await ensureDownloadDir();
    await cleanupOldFiles();

    // Extract video ID from URL
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    log(`Processing video ID: ${videoId}`);

    // Check for existing files
    const files = await fs.readdir(downloadDir);
    log('Current files in directory:', files);

    const existingFile = files.find(file => file.includes(videoId));
    if (existingFile) {
      log('Found existing file:', existingFile);
      return path.join(downloadDir, existingFile);
    }

    // Configure youtube-dl options
    const outputTemplate = path.join(downloadDir, `${videoId}.%(ext)s`);
    const options = {
      extractAudio: true,
      audioFormat: 'mp3',
      output: outputTemplate,
      noPlaylist: true,
      retries: 3,
      maxFilesize: '100m',
      verbose: true, // Enable verbose logging
    };

    // Retry the download
    log('Starting download...');
    await retryDownload(videoUrl, options);
    log('Download completed');

    // Find the downloaded file
    const updatedFiles = await fs.readdir(downloadDir);
    log('Files after download:', updatedFiles);

    audioFile = updatedFiles.find(file => file.includes(videoId));

    if (!audioFile) {
      throw new Error('Downloaded file not found in directory');
    }

    const finalPath = path.join(downloadDir, audioFile);
    log('Final audio file path:', finalPath);

    // Verify file exists and is readable
    await waitForFile(finalPath);

    return finalPath;
  } catch (error) {
    log('Error in downloadAudio:', error);
    throw new Error(`Download failed: ${error.message}`);
  }
}

module.exports = { downloadAudio };
