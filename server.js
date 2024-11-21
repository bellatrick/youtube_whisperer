const express = require('express');
const { AssemblyAI } = require('assemblyai');
const cors = require('cors');
const {languages}=require('countries-list')
require('dotenv').config();

const {
  analyzeContent,
  handleFileUpload,
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
      audio: fileBuffer
    });

    const prompt = `Generate a markdown tutorial using the following transcript. Return just the blog article markdown directly without any leading or introductory sentences`;
    const { response } = await client.lemur.task({
      transcript_ids: [transcript.id],
      prompt,
      final_model: 'anthropic/claude-3-5-sonnet'
    });

    res.status(200).json({ markdown: response });
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
    const target_language = req.body.target_language;
    //detect language using assembly ai
    console.log(target_language);

    const transcript = await client.transcripts.transcribe({
      audio: fileBuffer,
      language_detection: true
    });
    if (transcript.error) {
      return res.status(400).json({ error: true, message: transcript.error });
    }

    const language_code = transcript.language_code;
    const prompt = `This is a ${language_code} text. Provide the ${target_language} translation of this text. Return just your translation text directly without any leading or introductory sentences`;

    const { response } = await client.lemur.task({
      transcript_ids: [transcript.id],
      prompt,
      final_model: 'anthropic/claude-3-5-sonnet'
    });

    res.status(200).json({
      translation: response,
      transcript: text,
      language: language_code
    });
  } catch (error) {
    console.error('Error analyzing content:', error);
    res.status(500).json({
      error: true,
      message: 'An error occurred while analyzing the content. Please try again'
    });
  }
});

app.post('/api/fluency-analyzer', handleFileUpload, async (req, res) => {
  try {
    const fileBuffer = req.file.buffer;

    const transcript = await client.transcripts.transcribe({
      audio: fileBuffer,
      disfluencies: true
    });
    if (transcript.error) {
      return res.status(400).json({ error: true, message: transcript.error });
    }
    const transcriptId = transcript.id;
    console.log(transcript.text);
    const prompt = `Analyze the provided transcript for the frequency and types of filler words used by the speaker (e.g., "um," "uh," "like," "you know"). Additionally:
    Identify patterns or situations where filler words are most frequently used (e.g., during transitions, pauses, or when explaining complex ideas).
    Provide constructive suggestions to help the speaker reduce filler words, such as techniques for improving confidence, pacing, or preparation.
    Offer a brief review of the speaker's overall communication skills, including strengths and areas for improvement.
    Rate the speaker’s speech delivery on a scale of 1 to 10, considering clarity, engagement, and professionalism. Return your response in a markdown format. Return just your analysis directly without any leading or introductory sentences`;

    const { response } = await client.lemur.task({
      transcript_ids: [transcriptId],
      prompt,
      final_model: 'anthropic/claude-3-5-sonnet'
    });

    console.log(response);
    res.status(200).json({
      suggestions: response
    });
  } catch (error) {
    console.error('Error analyzing content:', error);
    res.status(500).json({
      error: true,
      message: 'An error occurred while analyzing the content. Please try again'
    });
  }
});

app.post('/api/generate-subtitle', handleFileUpload, async (req, res) => {
  try {
    const fileBuffer = req.file.buffer;
    const target_language = req.body.target_language;

    const transcript = await client.transcripts.transcribe({
      audio: fileBuffer,
      language_detection: true
    });
    if (transcript.error) {
      return res.status(400).json({ error: true, message: transcript.error });
    }
    let srt = await client.transcripts.subtitles(transcript.id, 'srt');
    console.log(srt);
    const language_code = transcript.language_code;

    if (target_language === 'en') {
      return res.status(200).json({ subtitle: srt, language: language_code });
    } else {
      const language=languages
      const prompt = `This is a ${language_code} subtitle text. I am a native speaker of ${languages[target_language].name}, please provide the translation of the subtitle texts:\n\n${srt}. Return just your translation text directly without any leading or introductory sentences. If you can't just say [Language not supported]`;
      const { response } = await client.lemur.task({
        transcript_ids: [transcript.id],
        prompt,
        final_model: 'anthropic/claude-3-5-sonnet'
      });
      console.log(response);
      return res.status(200).json({
        translation: response,
        subtitle: srt,
        language: language_code
      });
    }
  } catch (error) {
    console.error('Error analyzing content:', error);
    res.status(500).json({
      error: true,
      message: 'An error occurred while analyzing the content. Please try again'
    });
  }
});

app.get('/api/get-topics', async (req, res) => {
  const prompt =
    'Help me improve my speaking fluency by generating 5 random and engaging topics for a 1-minute speech. The topics should be diverse and thought-provoking to help me practice effectively.';
  try {
    const response = await handleAIResponse(prompt);
    if (response) {
      return res.status(200).json({ topics: response });
    } else
      return res
        .status(500)
        .json({ message: 'Something went wrong with the request, try again' });
  } catch (error) {
    console.log(error.message);
    return res
      .status(500)
      .json({ message: 'Something went wrong with the request, try again' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
