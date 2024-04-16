const express = require('express');
const axios = require('axios');
const tunnel = require('tunnel');
const qs = require('querystring');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

console.log(`Outbound route certificate is stored at this path: ${process.env['NODE_EXTRA_CA_CERTS']}`);

// Middleware to log incoming data from the front end
app.use((req, res, next) => {
    console.log('Incoming data from front end:', req.body);
    next();
});

function getProxyAgent() {
    const VGS_VAULT_ID = 'tntkmaqsnf9'; // Your VGS Vault ID
    const VGS_USERNAME = 'USpDfWz23n8FGztYxzi5RNDa'; // Your VGS Username
    const VGS_PASSWORD = '6563291f-aaec-49c4-b63f-45fbbc0e1fe3'; // Your VGS Password
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

    // Check for connectivity before sending the request
    agent.on('connect', () => {
        console.log('Connection established successfully.');
    });

    agent.on('error', (error) => {
        console.error('Error establishing connection:', error.message);
    });

    return agent;
}

app.post('/process-payment', async (req, res) => {
    console.log('Received tokenized payment data:', req.body);

    // Extract required fields from the incoming request body
    const { cc_number, cc_exp, cc_cvv } = req.body;

    try {
        // Get proxy agent
        const agent = getProxyAgent();

        // Prepare data to be sent to the outbound route
        const outboundData = {
            cc_number,
            cc_exp,
            cc_cvv
        };

        // Forward tokenized payment data to VGS for detokenization
        const vgsResponse = await axios.post('https://tntkmaqsnf9.sandbox.verygoodproxy.com/post', outboundData, {
            headers: {
                'Content-Type': 'application/json'
            },
            httpsAgent: agent // Use the proxy agent
        });

        console.log('Detokenized data received from VGS:', vgsResponse.data);

        // Further processing steps...
        
        res.status(200).json({ message: 'Payment processed successfully' });
    } catch (error) {
        console.error('Error processing payment:', error.message);
        res.status(500).json({ error: 'An error occurred while processing payment.' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html')); // Serve the HTML file
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);