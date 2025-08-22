require('dotenv').config();
const express = require('express');
const multer = require('multer');
const uploadPdf = require('./upload'); // tu upload.js

const app = express();
const upload = multer({ storage: multer.memoryStorage() }); // guarda el PDF en memoria

app.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    const buffer = req.file.buffer;
    const filename = req.file.originalname;
    await uploadPdf(buffer, filename);
    res.json({ success: true, message: 'PDF subido correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Servidor corriendo en puerto ${port}`));

