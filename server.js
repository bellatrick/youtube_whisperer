const { AssemblyAI } = require('assemblyai');const express = require('express');
const multer = require('multer');
const {  downloadAudio } = require('./audio');
const app = express();
const PORT = 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
require('dotenv').config();

const upload = multer({ dest: 'uploads/' });

const client = new AssemblyAI({
  apiKey: process.env.API_KEY
});

const audioFile = 'https://assembly.ai/wildfires.mp3';

const transcribeAudio = async (file) => {
  const params = {
    audio: file,
    content_safety: true,
    content_safety_confidence: 60
  };
  const transcript = await client.transcripts.transcribe(params);
  const contentSafetyLabels = transcript.content_safety_labels;
  console.log(contentSafetyLabels);

  return transcript;
};

// Upload audio or provide a URL
app.post('/upload', upload.single('audio'), async (req, res) => {
  const filePath = req.file ? req.file.path : null;
  const audioUrl = req.body.url;

  try {
    if (filePath) {
      const transcript = await transcribeAudio(filePath);
      return res.json({ transcript });
    } else if (audioUrl) {
      // If it's a URL input
      if (isYouTubeLink(audioUrl)) {
        // Handle YouTube URL
        //  const audioFilePath = await downloadAudio(audioUrl);
        const audioFilePath = await downloadAudio(audioUrl);
        const transcript = await transcribeAudio(audioFilePath);
        if (transcript.error){
          res.status(500).json({ error: transcript.error });
        }
        else return res.json({ transcript });
      } else {
        // Handle direct media link (MP3, MP4)
        const transcript = await transcribeAudio(audioUrl);
        return res.json({ transcript });
      }
    } else {
      return res.status(400).json({ error: 'No file or URL provided' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

function isYouTubeLink(url) {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
