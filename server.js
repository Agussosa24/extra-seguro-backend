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
const ONEDRIVE_DRIVE_ID = "b!j8urL_ABCDEFGHIJKLMN1234567890";
const ONEDRIVE_FOLDER = process.env.ONEDRIVE_FOLDER || "Formularios/Extra Seguro";

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

// 2) Asegurar carpeta (crea anidadas si no existen)
async function ensureFolder(accessToken, folderPath) {
  const segments = folderPath.split("/").filter(Boolean);

  let parentPath = ""; // acumulado
  for (const seg of segments) {
    parentPath += `/${seg}`;

    // Consultar si existe
    const getUrl = `https://graph.microsoft.com/v1.0/drives/${ONEDRIVE_DRIVE_ID}/root:${encodeURI(parentPath)}`;
    let res = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 404) {
      // Crear en el padre
      const parentDir = parentPath.slice(0, parentPath.lastIndexOf("/")) || "";
      const createUrl = `https://graph.microsoft.com/v1.0/drives/${ONEDRIVE_DRIVE_ID}/root:${encodeURI(parentDir)}:/children`;

      res = await fetch(createUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: seg,
          folder: {},
          "@microsoft.graph.conflictBehavior": "replace",
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`No pude crear carpeta "${seg}" en "${parentDir}": ${res.status} - ${t}`);
      }
    } else if (!res.ok) {
      const t = await res.text();
      throw new Error(`Error consultando "${parentPath}": ${res.status} - ${t}`);
    }
  }
}

// 3) Subir archivo a /drives/{driveId}/root:/<carpeta>/<archivo>:/content
async function uploadToOneDrive(accessToken, buffer, filename) {
  await ensureFolder(accessToken, ONEDRIVE_FOLDER);

  const uploadUrl = `https://graph.microsoft.com/v1.0/drives/${ONEDRIVE_DRIVE_ID}/root:/${ONEDRIVE_FOLDER}/${filename}:/content`;


  const up = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/pdf",
    },
    body: buffer,
  });

  const text = await up.text();
  if (!up.ok) {
    throw new Error(`Upload error: ${up.status} - ${text}`);
  }

  let json;
  try { json = JSON.parse(text); } catch { json = {}; }
  return json;
}

// 4) Endpoint para recibir el PDF desde el frontend
app.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Falta el archivo 'pdf' en form-data" });
    }
    const filename = (req.body.filename || req.file.originalname || "archivo.pdf").trim();

    const token = await getAccessToken();
    const result = await uploadToOneDrive(token, req.file.buffer, filename);

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



