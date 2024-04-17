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
    console.log('STEP 1: OUTBOUND - GOING TO THE OUBOUND CALL PATH:', vgs_outbound_url);
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
        console.log('RECEIVED CREDIT CARD INFO:', creditCardInfo); // Log received credit card info for debugging
        const paymentResponse = await postStripePayment(creditCardInfo);
        res.status(200).json(paymentResponse);
    } catch (error) {
        console.error('ERROR PROCESSING PAYMENT:', error);
        next(error); // Pass error to the error handling middleware
    }
});

// Function to post payment to Stripe API
async function postStripePayment(creditCardInfo) {
    const agent = getProxyAgent();
    const expiry = creditCardInfo['cc_exp'] ? creditCardInfo['cc_exp'].split('/') : ['', ''];
    const buff = Buffer.from(STRIPE_KEY + ":");
    const base64Auth = buff.toString('base64');

    const instance = axios.create({
        baseURL: 'https://api.stripe.com',
        headers: {
            'Authorization': `Basic ${base64Auth}`,
        },
        httpsAgent: agent,
    });

    console.log('SENDING PAYMENT METHOD DATA TO STRIPE:', creditCardInfo);
    const pm_response = await instance.post('/v1/payment_methods', qs.stringify({
        type: 'card',
        card: {
            number: creditCardInfo['cc_number'],
            cvc: creditCardInfo['cc_cvv'],
            exp_month: expiry[0].trim(),
            exp_year: expiry[1].trim()
        }
    }));
    console.log('PAYMENT METHOD RESPONSE:', pm_response.data);

    console.log('SENDING PAYMENT INTENT DATA TO STRIPE:', pm_response.data);
    const pi_response = await instance.post('/v1/payment_intents', qs.stringify({
        amount: 100,
        currency: 'usd',
        payment_method: pm_response.data.id,
        confirm: true
    }));
    console.log('PAYMENT INTENT RESPONSE:', pi_response.data);

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
