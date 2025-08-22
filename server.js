import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer();

// ⚡ Configuración desde variables de entorno
const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const TENANT_ID = process.env.TENANT_ID;

// Ruta para subir PDF
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se recibió ningún archivo" });
    }

    const filename = req.file.originalname;
    const fileBuffer = req.file.buffer;

    // 🔑 Pedimos token de acceso con client_credentials
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials",
        }),
      }
    );

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      return res.status(401).json({ error: "No se pudo obtener token", detalles: tokenData });
    }

    const accessToken = tokenData.access_token;

    // 📂 Guardamos archivo en OneDrive AppFolder (/approot)
    const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/special/approot:/${filename}:/content`;

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/pdf",
      },
      body: fileBuffer,
    });

    const result = await uploadResponse.json();

    if (!uploadResponse.ok) {
      return res.status(uploadResponse.status).json({ error: "Error al subir a OneDrive", detalles: result });
    }

    res.json({ mensaje: "PDF subido correctamente a OneDrive AppFolder ✅", detalles: result });
  } catch (err) {
    console.error("❌ Error en /upload:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});

