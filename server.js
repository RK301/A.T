const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ status: 'ok' }));

app.post('/translate', async (req, res) => {
  try {
    const { text, srcLang } = req.body;
    if (!text) return res.json({ translated: '' });
    const langMap = { ja:'ja', ko:'ko', zh:'zh-CN', es:'es', it:'it' };
    const lang = langMap[srcLang] || 'ja';
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${lang}&tl=en&dt=t&q=${encodeURIComponent(text.substring(0, 5000))}`;
    const response = await axios.get(url);
    const data = response.data;
    let translation = '';
    if (data && data[0]) {
      for (const segment of data[0]) if (segment && segment[0]) translation += segment[0];
    }
    res.json({ translated: translation.trim() || text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Translation server on ${PORT}`));