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

// Proxy configuration
function getProxyAgent() {
    const vgs_outbound_url = `${VGS_VAULT_ID}.sandbox.verygoodproxy.com`;
    return tunnel.httpsOverHttps({
        proxy: {
            servername: vgs_outbound_url,
            host: vgs_outbound_url,
            port: 8443,
            proxyAuth: `${VGS_USERNAME}:${VGS_PASSWORD}`
        },
    });
}

// Handle payment processing
app.post('/process-payment', async (req, res, next) => {
    const creditCardInfo = req.body;

    try {
        const paymentResponse = await postStripePayment(creditCardInfo);
        res.status(200).json(paymentResponse);
    } catch (error) {
        console.error('Error processing payment:', error);
        next(error); // Pass error to the error handling middleware
    }
});

// Function to post payment to Stripe API
async function postStripePayment(creditCardInfo) {
    const agent = getProxyAgent();
    const expiry = creditCardInfo['card-expiration-date'] ? creditCardInfo['card-expiration-date'].split('/') : ['', ''];
    const buff = Buffer.from(STRIPE_KEY + ":");
    const base64Auth = buff.toString('base64');

    const instance = axios.create({
        baseURL: 'https://api.stripe.com',
        headers: {
            'Authorization': `Basic ${base64Auth}`,
        },
        httpsAgent: agent,
    });

    const pm_response = await instance.post('/v1/payment_methods', qs.stringify({
        type: 'card',
        card: {
            number: creditCardInfo['card-number'],
            cvc: creditCardInfo['card-security-code'],
            exp_month: expiry[0].trim(),
            exp_year: expiry[1].trim()
        }
    }));
    console.log('Payment method response:', pm_response.data);

    const pi_response = await instance.post('/v1/payment_intents', qs.stringify({
        amount: 100,
        currency: 'usd',
        payment_method: pm_response.data.id,
        confirm: true
    }));
    console.log('Payment intent response:', pi_response.data);

    return pi_response.data;
}

// Serve index.html for root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});