const express = require('express');
const axios = require('axios');
const tunnel = require('tunnel');

const app = express();
const port = process.env.PORT || 3000;

const VGS_VAULT_ID = 'tntkmaqsnf9';
const VGS_USERNAME = 'USpDfWz23n8FGztYxzi5RNDa';
const VGS_PASSWORD = '6563291f-aaec-49c4-b63f-45fbbc0e1fe3';
const vgs_outbound_url = `${VGS_VAULT_ID}.sandbox.verygoodproxy.com`;
console.log(`Sending request through outbound Route: ${vgs_outbound_url}`);

// Create a tunneling agent for HTTPS requests
const agent = tunnel.httpsOverHttps({
    proxy: {
        servername: vgs_outbound_url,
        host: vgs_outbound_url,
        port: 8443,
        proxyAuth: `${VGS_USERNAME}:${VGS_PASSWORD}`
    },
});

app.use(express.json());

// Route to send data to outbound route
app.post('/process-payment', async (req, res) => {
    try {
        console.log('Incoming request data:', req.body);

        // Send data to VGS Outbound Route
        const vgsResponse = await axios.post(`https://${vgs_outbound_url}/post`, req.body, {
            httpsAgent: agent
        });

        console.log('VGS Response:', vgsResponse.data);

        res.status(200).send('Data sent to outbound route successfully.');
    } catch (error) {
        console.error('Error sending data to outbound route:', error.message);
        res.status(500).json({ error: 'An error occurred while sending data to outbound route.' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});