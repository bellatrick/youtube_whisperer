const youtubedl = require('youtube-dl-exec');
const fs = require('fs').promises;
const path = require('path');
const downloadDir = path.join(process.cwd(), 'temp_audio');

async function ensureDownloadDir() {
  try {
    await fs.mkdir(downloadDir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}
async function downloadAudio(videoUrl) {
  let audioFile;

  // Ensure the download directory exists before trying to access it
  await ensureDownloadDir();

  // Get the actual output filename
  const files = await fs.readdir(downloadDir);

  const outputTemplate = path.join(downloadDir, '%(id)s.%(ext)s');

  const options = {
    extractAudio: true,
    audioFormat: 'mp3',
    output: outputTemplate,
    noPlaylist: true,
    retries: 3,
    maxFilesize: '100m', // Adjust based on your needs
  };

  try {
    // Check if the file already exists in the download directory
    const file = files.find((file) => file.includes(videoUrl.split('v=')[1]));
    if (file) {
      audioFile = file;
    } else {
      console.log('Downloading audio...');
      await youtubedl(videoUrl, options);

      // Refresh the file list after downloading
      const updatedFiles = await fs.readdir(downloadDir);
      audioFile = updatedFiles.find((file) => file.includes(videoUrl.split('v=')[1]));
    }

    if (!audioFile) {
      throw new Error('Downloaded file not found');
    }

    return path.join(downloadDir, audioFile);
  } catch (error) {
    throw new Error(`Download failed: ${error.message}`);
  }
}

async function getYoutubeUrl(url){
  const videoInfo = await youtubedl(url, {
    dumpSingleJson: true,
    preferFreeFormats: true,
    addHeader: ["referer:youtube.com", "user-agent:googlebot"],
  });

  const audioUrl = videoInfo.formats.reverse().find(
    (format) => format.resolution === "audio only" && format.ext === "m4a",
  )?.url;

  if (!audioUrl) {
    throw new Error("No audio only format found");
  }
  console.log("Audio URL retrieved successfully");
  console.log("Audio URL:", audioUrl);
  return audioUrl

}

module.exports = { downloadAudio,getYoutubeUrl };
