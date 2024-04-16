const express = require('express');
const axios = require('axios');
const tunnel = require('tunnel');

const app = express();
const port = process.env.PORT || 3000;

// Function to get proxy agent for outbound route
function getProxyAgent() {
    const VGS_VAULT_ID = 'tntkmaqsnf9';
    const VGS_USERNAME = 'USpDfWz23n8FGztYxzi5RNDa';
    const VGS_PASSWORD = '6563291f-aaec-49c4-b63f-45fbbc0e1fe3';
    const vgs_outbound_url = `${VGS_VAULT_ID}.sandbox.verygoodproxy.com`;

    console.log(`Outbound route URL: ${vgs_outbound_url}`);

    return tunnel.httpsOverHttps({
        proxy: {
            servername: vgs_outbound_url,
            host: vgs_outbound_url,
            port: 8443,
            proxyAuth: `${VGS_USERNAME}:${VGS_PASSWORD}`
        },
    });
}

// Route to send data to outbound route
app.post('/send-to-outbound', async (req, res) => {
    try {
        console.log('Incoming request data:', req.body);

        // Get proxy agent for VGS Outbound Route
        const agent = getProxyAgent();

        // Send data to VGS Outbound Route
        const vgsResponse = await axios.post('https://tntkmaqsnf9.sandbox.verygoodproxy.com/post', req.body, {
            httpsAgent: agent
        });

        console.log('VGS Response:', vgsResponse.data);

        res.status(200).send('Data sent to outbound route successfully.');
    } catch (error) {
        console.error('Error sending data to outbound route:', error.message);
        res.status(500).json({ error: 'An error occurred while sending data to outbound route.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});