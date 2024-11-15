const youtubedl = require('youtube-dl-exec');
const fs = require('fs').promises;
const path = require('path');

// Use environment variable for temp directory with fallback
const tempDir = process.env.TEMP_DIR || process.env.TMPDIR || '/tmp';
const downloadDir = path.join(tempDir, 'temp_audio');

// Add more detailed logging
const log = (message, data = '') => {
  console.log(`[YouTube Downloader] ${message}`, data);
};

async function ensureDownloadDir() {
  try {
    await fs.access(downloadDir);
    log(`Download directory exists: ${downloadDir}`);
  } catch (error) {
    log(`Creating download directory: ${downloadDir}`);
    await fs.mkdir(downloadDir, { recursive: true });
  }
}

async function cleanupOldFiles() {
  try {
    const files = await fs.readdir(downloadDir);
    const currentTime = Date.now();

    for (const file of files) {
      const filePath = path.join(downloadDir, file);
      const stats = await fs.stat(filePath);

      // Remove files older than 1 hour
      if (currentTime - stats.mtimeMs > 3600000) {
        await fs.unlink(filePath);
        log(`Cleaned up old file: ${file}`);
      }
    }
  } catch (error) {
    log('Error during cleanup:', error.message);
  }
}

async function downloadAudio(videoUrl) {
  let audioFile;

  try {
    // Ensure directory exists and clean old files
    await ensureDownloadDir();
    await cleanupOldFiles();

    // Extract video ID from URL
    const videoId = videoUrl.includes('v=')
      ? videoUrl.split('v=')[1].split('&')[0]
      : videoUrl.split('/').pop();

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

    // Download the audio
    log('Starting download...');
    await youtubedl(videoUrl, options);
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
    await fs.access(finalPath, fs.constants.R_OK);

    return finalPath;
  } catch (error) {
    log('Error in downloadAudio:', error);
    throw new Error(`Download failed: ${error.message}`);
  }
}

module.exports = { downloadAudio };