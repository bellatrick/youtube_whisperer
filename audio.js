const youtubedl = require('youtube-dl-exec');
const { Readable } = require('stream');

async function getYoutubeAudio(youtubeUrl) {
    console.debug('[getYoutubeAudio] Starting audio extraction for URL:', youtubeUrl);

    try {
        // Get video info first
        console.debug('[getYoutubeAudio] Fetching video information...');
        const videoInfo = await youtubedl(youtubeUrl, {
            dumpSingleJson: true,
            noCheckCertificates: true,
            preferFreeFormats: true,
        });

        console.debug('[getYoutubeAudio] Video information retrieved:', {
            title: videoInfo.title,
            duration: videoInfo.duration,
            format: videoInfo.format
        });

        // Download audio stream
        console.debug('[getYoutubeAudio] Starting audio download...');
        const download = youtubedl.exec(youtubeUrl, {
            extractAudio: true,
            audioFormat: 'mp3',
            output: '-',
            username:"oauth2",
            password:""
        });

        // Create readable stream from stdout
        console.debug('[getYoutubeAudio] Creating audio stream...');
        const audioStream = new Readable();
        audioStream._read = () => {}; 

        return new Promise((resolve, reject) => {
            const chunks = [];

            download.stdout.on('data', (chunk) => {
                console.debug('[getYoutubeAudio] Received data chunk:', chunk.length, 'bytes');
                chunks.push(chunk);
            });

            download.stdout.on('end', () => {
                console.debug('[getYoutubeAudio] Download completed, creating buffer...');
                const buffer = Buffer.concat(chunks);
                console.debug('[getYoutubeAudio] Final buffer size:', buffer.length, 'bytes');
                resolve(buffer);
            });

            download.stderr.on('data', (data) => {
                console.debug('[getYoutubeAudio] youtube-dl message:', data.toString());
            });

            download.on('error', (error) => {
                console.error('[getYoutubeAudio] Error during download:', error);
                reject(error);
            });
        });
    } catch (error) {
        console.error('[getYoutubeAudio] Fatal error:', error);
        throw error;
    }
}

module.exports = {getYoutubeAudio};