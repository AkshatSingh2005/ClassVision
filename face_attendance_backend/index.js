const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const axios = require('axios');

const multer = require('multer');
const fs = require('fs');

const Student = require('./models/Student');
const Attendance = require('./models/Attendance');
const Material = require('./models/Material');

const pdf = require('pdf-parse-fixed');          // PDF -> text parser

// Multer storage for study materials
const materialUpload = multer({ dest: 'uploads/materials/' });

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ---- Mongo connection ----
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('Mongo error:', err));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'face-attendance-parallel-backend' });
});

// ---------- Students (parallel store) ----------
app.post('/students', async (req, res) => {
  try {
    console.log('POST /students received body:', req.body);
    const {
      classId,
      id,
      name,
      gender,
      guardianName,
      contactInfo,
      faceDescriptor,
    } = req.body;

    if (!faceDescriptor) {
      return res.status(400).json({ message: 'faceDescriptor required' });
    }

    const student = new Student({
      classId,
      id,
      name,
      gender,
      guardianName,
      contactInfo,
      faceDescriptor,
    });
    await student.save();
    res.status(201).json({ message: 'Student with descriptor stored' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/students', async (req, res) => {
  try {
    const { classId } = req.query;
    const query = classId ? { classId } : {};
    const students = await Student.find(query).lean();
    res.json(students);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- Attendance ----------
app.post('/attendance', async (req, res) => {
  try {
    const { classId, date, absentees, attendancePercentage } = req.body;
    if (!classId || !date) {
      return res.status(400).json({ message: 'classId and date are required' });
    }
    const record = new Attendance({
      classId,
      date,
      absentees,
      attendancePercentage,
    });
    await record.save();
    res
      .status(201)
      .json({ message: 'Attendance stored in parallel DB' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- Study Materials ----------
// Upload PDF, extract text, save both
app.post(
  '/materials/upload',
  materialUpload.single('file'),
  async (req, res) => {
    try {
      console.log('UPLOAD /materials/upload body:', req.body);
      console.log('UPLOAD file:', req.file);

      const { classId, title } = req.body;
      const file = req.file;

      if (!classId || !title || !file) {
        return res.status(400).json({
          message: 'classId, title and file are required',
        });
      }

      // Read the uploaded PDF file
      const dataBuffer = fs.readFileSync(file.path);

      // Extract text using pdf-parse-fixed
      const pdfData = await pdf(dataBuffer);
      const extractedText = pdfData.text || '';

      const material = new Material({
        classId,
        title,
        type: 'pdf',
        content: extractedText,
        filePath: file.path,
        originalName: file.originalname,
      });

      await material.save();
      res
        .status(201)
        .json({ message: 'Material stored', id: material._id });
    } catch (e) {
      console.error('Error in /materials/upload:', e);
      res.status(500).json({
        message: 'Server error while saving material',
      });
    }
  }
);

// List materials by class
app.get('/materials', async (req, res) => {
  try {
    const { classId } = req.query;
    const filter = classId ? { classId } : {};
    const materials = await Material.find(filter).sort({ createdAt: -1 });
    res.json(materials);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate quiz from material content using OpenRouter
app.post('/materials/:id/quiz', async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // reuse existing quiz if already generated
    if (material.quiz && material.quiz.length > 0) {
      return res.json({ quiz: material.quiz, cached: true });
    }

    const text = material.content.slice(0, 4000); // keep prompt small

    const prompt = `
You are a helpful teacher assistant. From the following study material, create 5 multiple-choice questions.

Return ONLY valid JSON in this exact format (no explanation, no markdown):

[
  {
    "question": "text of the question?",
    "options": ["option A", "option B", "option C", "option D"],
    "answer": "A"
  }
]

Study material:
${text}
`;

    const model =
      process.env.OPENROUTER_QUIZ_MODEL || 'openai/gpt-oss-20b:free';

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages: [
          { role: 'system', content: 'You generate clean JSON quizzes.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 600,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content =
      response.data.choices?.[0]?.message?.content?.trim() || '[]';

    let quizJson;
    try {
      // handle if model wraps JSON with text
      const start = content.indexOf('[');
      const end = content.lastIndexOf(']');
      const jsonStr =
        start !== -1 && end !== -1 ? content.slice(start, end + 1) : content;
      quizJson = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse quiz JSON from OpenRouter:', e, content);
      return res
        .status(500)
        .json({ message: 'Model returned invalid JSON for quiz.' });
    }

    if (!Array.isArray(quizJson)) {
      return res
        .status(500)
        .json({ message: 'Quiz JSON is not an array.' });
    }

    material.quiz = quizJson.map((q) => ({
      question: q.question,
      options: q.options,
      answer: q.answer,
    }));

    await material.save();

    res.json({ quiz: material.quiz, cached: false });
  } catch (e) {
    console.error('Error in /materials/:id/quiz:', e.response?.data || e);
    res.status(500).json({ message: 'Failed to generate quiz' });
  }
});

// List materials that have quizzes for a class
app.get('/quizzes', async (req, res) => {
  try {
    const { classId } = req.query;
    if (!classId) {
      return res.status(400).json({ message: 'classId required' });
    }

    const materials = await Material.find({
      classId,
      quiz: { $exists: true, $ne: [] },
    }).select('title quiz createdAt');

    res.json(materials);
  } catch (e) {
    console.error('Error in /quizzes:', e);
    res.status(500).json({ message: 'Server error' });
  }
});


// ---------- Start server ----------
const port = process.env.PORT || 5050;
app.listen(port, () =>
  console.log(`Parallel backend running on port ${port}`)
);
