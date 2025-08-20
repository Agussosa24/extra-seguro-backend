const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');
const { ClientSecretCredential } = require('@azure/identity');

const app = express();
const cors = require("cors");
app.use(cors());
const PORT = 3000;

// 🔹 PONÉ TUS DATOS DE AZURE AQUÍ
const tenantId = "e3cdf199-0408-4ad9-b37c-4e8d682211b9";
const clientId = "f1b18efc-5ceb-455a-912e-d5e6f27f621e";
const clientSecret = "0WZ8Q~w4pyaLFOmm.xo7SjW_iSo8.3UYK-3a6a3h";

const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
async function getGraphClient() {
  const tokenResponse = await credential.getToken("https://graph.microsoft.com/.default");
  const client = Client.init({
    authProvider: (done) => {
      done(null, tokenResponse.token);
    }
  });
  return client;
}

// Middleware
app.use(bodyParser.json({ limit: '50mb' })); // soporte para archivos grandes

// Endpoint para recibir PDF
app.post('/upload', async (req, res) => {
  try {
    const { filename, fileBase64 } = req.body;
    if (!filename || !fileBase64) {
      return res.json({ success: false, error: 'Faltan datos' });
    }

    const fileBuffer = Buffer.from(fileBase64, 'base64');
    const client = await getGraphClient();

    // Path completo en OneDrive/SharePoint
    const folderPath = '/Documents/Formularios/Extra Seguro'; // tu carpeta

    await client.api(`/me/drive/root:${folderPath}/${filename}:/content`)
      .put(fileBuffer);

    res.json({ success: true, message: 'PDF subido correctamente' });
  } catch (error) {
    console.error(error);
    res.json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
