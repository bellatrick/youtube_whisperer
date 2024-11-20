const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
require('dotenv').config();
const { Translate } = require('@google-cloud/translate').v2;

const translate = new Translate({
  projectId: 'twitter-e364c',
  key: process.env.GOOGLE_API_KEY
});
const handleTranslation = async (text) => {
  return new Promise((resolve, reject) => {
    translate
      .translate(text, 'en')
      .then((translations) => {
        const translatedText = translations[0];
        resolve(translatedText);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 50MB limit
    files: 1 // Allow only 1 file per request
  }
}).single('file');
function formatTimestamp(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else {
    return `${minutes}m ${seconds}s`;
  }
}

function cleanMarkdownString(markdownString) {
  const startPattern = /^```markdown\s*/;
  const endPattern = /\s*```$/;
  return markdownString.replace(startPattern, '').replace(endPattern, '');
}

function analyzeContent(dataArray) {
  const wordFrequency = {};
  const timestamps = [];

  dataArray.forEach((item) => {
    if (item.labels && item.labels.length > 0) {
      item.labels.forEach((label) => {
        // Update word frequency
        const word = label.label.toLowerCase(); // Normalize word
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;

        // Add to timestamps
        timestamps.push({
          time_start: formatTimestamp(item.timestamp.start),
          time_end: formatTimestamp(item.timestamp.end),
          word,
          severity: label.severity || 0
        });
      });
    }
  });

  // Convert wordFrequency object to array
  const wordFrequencyArray = Object.entries(wordFrequency).map(
    ([word, frequency]) => ({ word, frequency })
  );

  return {
    wordFrequency: wordFrequencyArray,
    timestamps
  };
}

const handleFileUpload = async (req, res, next) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      return res
        .status(400)
        .json({ error: true, message: `Upload error: ${err.message}` });
    } else if (err) {
      console.error('Unknown error:', err);
      return res.status(500).json({
        error: true,
        message: 'An unknown error occurred during upload'
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: true, message: 'No file uploaded' });
    }

    next();
  });
};
const api_key = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const handleAIResponse = async (prompt) => {
  try {
    const genAI = new GoogleGenerativeAI(api_key);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return error.message;
  }
};

module.exports = {
  formatTimestamp,
  analyzeContent,
  cleanMarkdownString,
  handleFileUpload,
  handleTranslation,
  handleAIResponse
};
