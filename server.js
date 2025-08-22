const express = require("express");
const fetch = require("node-fetch");
const qs = require("querystring");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json({ limit: "10mb" })); // Para recibir PDF en base64

// 🔑 Tus credenciales de Azure AD
const tenantId = "TU_TENANT_ID";
const clientId = "TU_CLIENT_ID";
const clientSecret = "TU_CLIENT_SECRET";

// 1️⃣ Obtener un Access Token con client_credentials
async function getAccessToken() {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const body = qs.stringify({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json();
  if (data.access_token) return data.access_token;
  throw new Error(JSON.stringify(data));
}

// 2️⃣ Verificar que AppFolder exista
async function ensureAppFolder(accessToken) {
  const url = "https://graph.microsoft.com/v1.0/me/drive/special/approot/children";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Error al verificar AppFolder:", error);
      return;
    }

    const result = await response.json();
    console.log("📁 AppFolder verificado:", result);
  } catch (err) {
    console.error("Error en ensureAppFolder:", err);
  }
}

// 3️⃣ Subir archivo a AppFolder
async function uploadToAppFolder(accessToken, fileBuffer, filename) {
  const url = `https://graph.microsoft.com/v1.0/me/drive/special/approot:/${filename}:/content`;

  const response = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: fileBuffer,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error al subir archivo: ${error}`);
  }

  const result = await response.json();
  console.log("✅ Archivo subido:", result);
  return result;
}

// 4️⃣ Endpoint para recibir PDF desde el frontend
app.post("/upload-pdf", async (req, res) => {
  try {
    const { pdfBase64, filename } = req.body;

    if (!pdfBase64 || !filename) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    const fileBuffer = Buffer.from(pdfBase64, "base64");
    const accessToken = await getAccessToken();

    // Verifica AppFolder
    await ensureAppFolder(accessToken);

    // Sube el archivo
    const uploadResult = await uploadToAppFolder(accessToken, fileBuffer, filename);

    res.json({ success: true, data: uploadResult });
  } catch (err) {
    console.error("❌ Error en /upload-pdf:", err);
    res.status(500).json({ error: err.message });
  }
});

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});


// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});


