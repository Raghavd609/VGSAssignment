const express = require('express');
const axios = require('axios');
const tunnel = require('tunnel');
const qs = require('qs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const VGS_VAULT_ID = 'tntkmaqsnf9';
const VGS_USERNAME = 'USpDfWz23n8FGztYxzi5RNDa';
const VGS_PASSWORD = '6563291f-aaec-49c4-b63f-45fbbc0e1fe3';
const STRIPE_KEY = 'sk_test_51Lrs6CK6opjUgeSmFHReX14eBMcbofCJrUOisGTC7ASpkfFMqD6Eysbs83qBC12YZErV3nv1Pg4UTy9WRhPRVUpQ00o7cUrV8I';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

console.log(`Outbound route certificate is stored at this path: ${process.env['NODE_EXTRA_CA_CERTS']}`);

// Proxy configuration for outbound VGS
function getProxyAgent() {
    const vgs_outbound_url = `${VGS_VAULT_ID}.sandbox.verygoodproxy.com`
    console.log(`Sending request through outbound Route: ${vgs_outbound_url}`);
    return tunnel.httpsOverHttps({
        proxy: {
            servername: vgs_outbound_url,
            host: vgs_outbound_url,
            port: 8443,
            proxyAuth: `${VGS_USERNAME}:${VGS_PASSWORD}`
        },
    });
}

app.post('/process-payment', async (req, res) => {
    console.log('Received request:', req.body);

    const creditCardData = req.body;

    if (!creditCardData || !creditCardData['card-expiration-date'] || !creditCardData['card-number'] || !creditCardData['card-security-code']) {
        console.error('Invalid or missing credit card information');
        return res.status(400).json({ error: 'Invalid or missing credit card information' });
    }

    const expiry = creditCardData['card-expiration-date'].split('/');
    const exp_month = expiry[0].trim();
    const exp_year = expiry[1].trim();

    if (isNaN(exp_month) || exp_month < 1 || exp_month > 12 || isNaN(exp_year) || exp_year.length !== 2) {
        return res.status(400).json({ error: "Expiration date is out of range or incorrectly formatted" });
    }

    try {
        const tokenizedData = await tokenizeCreditCardData(creditCardData);
        console.log('Tokenized Data:', tokenizedData);
        const paymentResponse = await postStripePayment(tokenizedData);
        res.status(200).json(paymentResponse);
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({ error: error.message });
    }
});

async function tokenizeCreditCardData(creditCardData) {
    const agent = getProxyAgent();

    const instance = axios.create({
        baseURL: `https://${VGS_VAULT_ID}.sandbox.verygoodproxy.com`,
        headers: {
            'Content-Type': 'application/json'
        },
        httpsAgent: agent,
    });

    const vgsResponse = await instance.post('/post', creditCardData);

    console.log('Received tokenized data from VGS:', vgsResponse.data);
    return vgsResponse.data;
}

async function postStripePayment(tokenizedData) {
    const agent = getProxyAgent();

    const instance = axios.create({
        baseURL: 'https://api.stripe.com',
        headers: {
            'Authorization': `Basic ${Buffer.from(STRIPE_KEY + ':').toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        httpsAgent: agent,
    });

    console.log('Sending tokenized data to Stripe:', tokenizedData);
    const pm_response = await instance.post('/v1/payment_methods', qs.stringify({
        type: 'card',
        card: {
            number: tokenizedData['card-number'],
            cvc: tokenizedData['card-security-code'],
            exp_month: tokenizedData['card-expiration-date'].split('/')[0].trim(),
            exp_year: tokenizedData['card-expiration-date'].split('/')[1].trim()
        }
    }));

    console.log('Payment Method Response:', pm_response.data);
    return pm_response.data;
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
