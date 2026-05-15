const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// Health check endpoint (for UptimeRobot and Render)
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Manga OCR backend is running' });
});

// OCR endpoint
app.post('/ocr', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    const language = req.body.language || 'ja';
    const tesseractLangMap = { ja:'jpn', ko:'kor', zh:'chi_sim', es:'spa', it:'ita' };
    const tesseractLang = tesseractLangMap[language] || 'jpn';
    
    const { data: { text } } = await Tesseract.recognize(req.file.buffer, tesseractLang, {
      logger: () => {}
    });
    
    if (!text || text.trim().length === 0) {
      return res.json({ original: '', translated: '' });
    }
    
    // Translate using Google Translate
    const langMap = { ja:'ja', ko:'ko', zh:'zh-CN', es:'es', it:'it' };
    const targetLang = langMap[language] || 'ja';
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${targetLang}&tl=en&dt=t&q=${encodeURIComponent(text.substring(0, 5000))}`;
    const response = await axios.get(url);
    const data = response.data;
    let translation = '';
    if (data && data[0]) {
      for (const segment of data[0]) {
        if (segment && segment[0]) translation += segment[0];
      }
    }
    const translated = translation.trim() || text;
    
    res.json({ original: text.trim(), translated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Use the PORT provided by Render (default 10000)
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});