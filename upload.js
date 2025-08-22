const msal = require('@azure/msal-node');
const axios = require('axios');

const config = {
  auth: {
    clientId: process.env.CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
    clientSecret: process.env.CLIENT_SECRET
  }
};

const cca = new msal.ConfidentialClientApplication(config);

module.exports = async function uploadPdf(buffer, filename) {
  const tokenResponse = await cca.acquireTokenByClientCredential({
    scopes: ["https://graph.microsoft.com/.default"]
  });

  const accessToken = tokenResponse.accessToken;

  const url = `https://graph.microsoft.com/v1.0/me/drive/special/approot:/${filename}:/content`;

  await axios.put(url, buffer, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/pdf'
    }
  });
};
