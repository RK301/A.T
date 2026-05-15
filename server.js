const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const axios = require('axios');
const cors = require('cors');
const sharp = require('sharp'); // add this dependency

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Manga OCR backend running' });
});

app.post('/ocr', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const language = req.body.language || 'ja';
    const tesseractLangMap = { ja:'jpn', ko:'kor', zh:'chi_sim', es:'spa', it:'ita' };
    const tesseractLang = tesseractLangMap[language] || 'jpn';
    
    // Scale down image to max 2000px on longest side (saves memory)
    let imageBuffer = req.file.buffer;
    const { width, height } = await sharp(imageBuffer).metadata();
    if (width > 2000 || height > 2000) {
      const scale = 2000 / Math.max(width, height);
      imageBuffer = await sharp(imageBuffer)
        .resize(Math.floor(width * scale), Math.floor(height * scale))
        .jpeg({ quality: 70 })
        .toBuffer();
      console.log(`Scaled from ${width}x${height} to smaller size`);
    }
    
    const { data: { text } } = await Tesseract.recognize(imageBuffer, tesseractLang, {
      logger: () => {}
    });
    
    if (!text || !text.trim()) return res.json({ original: '', translated: '' });
    
    const langMap = { ja:'ja', ko:'ko', zh:'zh-CN', es:'es', it:'it' };
    const targetLang = langMap[language] || 'ja';
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${targetLang}&tl=en&dt=t&q=${encodeURIComponent(text.substring(0, 5000))}`;
    const response = await axios.get(url);
    const data = response.data;
    let translation = '';
    if (data && data[0]) {
      for (const segment of data[0]) if (segment && segment[0]) translation += segment[0];
    }
    const translated = translation.trim() || text;
    res.json({ original: text.trim(), translated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));