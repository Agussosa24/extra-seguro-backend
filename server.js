const express = require("express");
const multer = require("multer");
const fetch = require("node-fetch"); // v2
const qs = require("querystring");
const cors = require("cors");

const app = express();
const upload = multer();

// ⚠️ Variables de entorno (configurarlas en Render)
const TENANT_ID = process.env.TENANT_ID;                 
const CLIENT_ID = process.env.CLIENT_ID;                 
const CLIENT_SECRET = process.env.CLIENT_SECRET;         
const SITE_ID = process.env.SITE_ID; // ID del sitio SharePoint
const DRIVE_ID = process.env.DRIVE_ID; // ID del drive de Documentos compartidos
const FOLDER_PATH = "Extra Seguro"; // Carpeta dentro de Documentos

// CORS
app.use(cors({
  origin: ["https://agussosa24.github.io"],
  methods: ["POST"],
}));

// Sanity check
app.get("/", (req, res) => res.send("OK"));

// 1) Obtener token (app-only)
async function getAccessToken() {
  const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

  const body = qs.stringify({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const r = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await r.json();
  if (!r.ok) {
    throw new Error(`Token error: ${r.status} - ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

// 2) Subir archivo a SharePoint
async function uploadToSharePoint(accessToken, buffer, filename) {
  const uploadUrl = `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/root:/${FOLDER_PATH}/${filename}:/content`;

  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/pdf"
    },
    body: buffer
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error subiendo PDF: ${res.status} - ${text}`);
  }

  return res.json();
}

// 3) Endpoint para recibir el PDF desde el frontend
app.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Falta el archivo 'pdf' en form-data" });
    }
    const filename = (req.body.filename || req.file.originalname || "archivo.pdf").trim();

    const accessToken = await getAccessToken();
    const result = await uploadToSharePoint(accessToken, req.file.buffer, filename);

    res.json({
      ok: true,
      id: result.id,
      name: result.name,
      webUrl: result.webUrl,
    });
  } catch (e) {
    console.error("❌ /upload:", e);
    res.status(500).json({ error: e.message });
  }
});

// Iniciar
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend listo en puerto ${PORT}`);
});









