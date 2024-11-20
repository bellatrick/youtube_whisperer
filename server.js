const express = require('express');
const { AssemblyAI } = require('assemblyai');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const {
  cleanMarkdownString,
  analyzeContent,
  handleFileUpload,
  handleTranslation,
  handleAIResponse
} = require('./helperFunctions');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors((origin = '*')));

// Configure AssemblyAI
const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY
});

// Endpoint: Generate blog Markdown
app.post('/api/generate-blog', handleFileUpload, async (req, res) => {
  try {
    const fileBuffer = req.file.buffer;

    // Transcribe the file using AssemblyAI
    const transcript = await client.transcripts.transcribe({
      audio: fileBuffer,
      summarization: true,
      summary_model: 'informative',
      summary_type: 'bullets'
    });

    const prompt = `Generate a markdown tutorial of the following transcript:\n\n${transcript.summary}.`;
    const transcriptResult = await handleAIResponse(prompt);
    console.log(transcriptResult);

    res.status(200).json({ markdown: cleanMarkdownString(transcriptResult) });
  } catch (error) {
    console.error('Error generating blog:', error);
    res.status(500).json({
      error: true,
      message: 'An error occurred while generating the blog'
    });
  }
});

// Endpoint: Analyze content
app.post('/api/analyze-content', handleFileUpload, async (req, res) => {
  try {
    const fileBuffer = req.file.buffer;

    // Transcribe the file using AssemblyAI
    const transcript = await client.transcripts.transcribe({
      audio: fileBuffer,
      content_safety: true,
      content_safety_confidence: 60
    });

    if (transcript.error) {
      return res.status(400).json({ error: true, message: transcript.error });
    }

    const contentSafetyLabels = transcript.content_safety_labels;
    const analysis = analyzeContent(contentSafetyLabels.results);

    if (contentSafetyLabels.results.length > 0) {
      res.status(200).json(analysis);
    } else {
      res
        .status(200)
        .json({ message: 'This content has no content safety issues' });
    }
  } catch (error) {
    console.error('Error analyzing content:', error);
    res.status(500).json({
      error: true,
      message: 'An error occurred while analyzing the content'
    });
  }
});

app.post('/api/translate-content', handleFileUpload, async (req, res) => {
  try {
    const fileBuffer = req.file.buffer;
    const target_language = req.target_language;
    //detect language using assembly ai

    const transcript = await client.transcripts.transcribe({
      audio: fileBuffer,
      language_detection: true
    });
    if (transcript.error) {
      return res.status(400).json({ error: true, message: transcript.error });
    }

    const text = transcript.text;
    const language_code = transcript.language_code;
    const prompt = `This is a ${language_code} text. Provide the ${target_language} translation of this text:\n\n${text}.`;


    const translation = await handleAIResponse(prompt);

    res.status(200).json({

      translation: translation,
      transcript: text,
      language:language_code
    });
  } catch (error) {
    console.error('Error analyzing content:', error);
    res.status(500).json({
      error: true,
      message: 'An error occurred while analyzing the content. Please try again'
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
