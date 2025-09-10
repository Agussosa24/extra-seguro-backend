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

// Carpeta por defecto si no se pasa ninguna
const DEFAULT_FOLDER = process.env.FOLDER_PATH || "Extra Seguro";

// 🌍 CORS seguro con variable de entorno ALLOWED_ORIGIN
// Ejemplo: ALLOWED_ORIGIN="https://agussosa24.github.io,https://otrodominio.com"
const allowedOrigins = (process.env.ALLOWED_ORIGIN || "").split(",").filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : "*", // fallback a "*" si no hay configurado
  methods: ["POST", "OPTIONS"],
}));

// habilitar preflight específico para /upload
app.options("/upload", cors());

// Sanity check
app.get("/", (req, res) => res.send("✅ Backend funcionando"));

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
async function uploadToSharePoint(accessToken, buffer, filename, folder) {
  const safeFolder = encodeURI(folder);       // carpeta (permite espacios)
  const safeName   = encodeURIComponent(filename); // archivo
  const uploadUrl  = `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/root:/${safeFolder}/${safeName}:/content`;

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

    // 👉 Carpeta dinámica según lo que mande la web
    const folder = (req.body.folder && req.body.folder.trim()) || DEFAULT_FOLDER;

    const accessToken = await getAccessToken();
    const result = await uploadToSharePoint(accessToken, req.file.buffer, filename, folder);

    res.json({
      ok: true,
      id: result.id,
      name: result.name,
      webUrl: result.webUrl,
      folder: folder,
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










