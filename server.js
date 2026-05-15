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

// Map language codes to Tesseract language strings
const tesseractLangMap = {
  ja: 'jpn',
  ko: 'kor',
  zh: 'chi_sim',
  es: 'spa',
  it: 'ita'
};

// Translate using Google Translate (free, no key)
async function translateText(text, srcLang) {
  const langMap = { ja: 'ja', ko: 'ko', zh: 'zh-CN', es: 'es', it: 'it' };
  const lang = langMap[srcLang] || 'ja';
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${lang}&tl=en&dt=t&q=${encodeURIComponent(text.substring(0, 5000))}`;
  const response = await axios.get(url);
  const data = response.data;
  let translation = '';
  if (data && data[0]) {
    for (const segment of data[0]) {
      if (segment && segment[0]) translation += segment[0];
    }
  }
  return translation.trim() || text;
}

// OCR endpoint
app.post('/ocr', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    const language = req.body.language || 'ja';
    const tesseractLang = tesseractLangMap[language] || 'jpn';
    
    // Perform OCR on the full image (no splitting needed on server)
    const { data: { text } } = await Tesseract.recognize(req.file.buffer, tesseractLang, {
      logger: () => {} // silent
    });
    
    if (!text || text.trim().length === 0) {
      return res.json({ text: '', translated: '' });
    }
    
    // Translate the extracted text
    const translated = await translateText(text, language);
    
    res.json({
      original: text.trim(),
      translated: translated
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));