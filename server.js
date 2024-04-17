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

// Proxy configuration for outbound VGS
function getProxyAgent() {
    const vgs_outbound_url = `${VGS_VAULT_ID}.sandbox.verygoodproxy.com`;
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
    const creditCardData = req.body.data ? JSON.parse(req.body.data) : req.body;

    if (!creditCardData || !creditCardData.cc_exp || !creditCardData.cc_number || !creditCardData.cc_cvv) {
        console.error('Invalid or missing credit card information');
        return res.status(400).json({ error: 'Invalid or missing credit card information' });
    }

    try {
        const paymentMethodResponse = await postStripePayment(creditCardData);
        res.status(200).json(paymentMethodResponse);
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({ error: error.message });
    }
});


async function postStripePayment(creditCardData) {
    const agent = getProxyAgent();
    const expiry = creditCardData.cc_exp.split('/');
    const exp_month = expiry[0].trim();
    const exp_year = expiry[1].trim();

    const instance = axios.create({
        baseURL: 'https://api.stripe.com',
        headers: {
            'Authorization': `Basic ${Buffer.from(STRIPE_KEY + ':').toString('base64')}`,
        },
        httpsAgent: agent,
    });
    console.info('EXP Month ', exp_month);
    console.info('EXP Year ',  exp_year);

    console.info('Sending payment data through VGS:', creditCardData.cc_number);
    console.info('Sending payment data through VGS:',creditCardData.cc_cvv);
    console.info('Sending payment data through VGS:',exp_month);,
    console.info('Sending payment data through VGS:',exp_year);

    const paymentMethodResponse = await instance.post('/v1/payment_methods', qs.stringify({
        type: 'card',
        card: {
            num: creditCardData.cc_number,
            cvc: creditCardData.cc_cvv,
            exp_month: exp_month,
            exp_year: exp_year  // Assuming the year is provided in two digits
        }
    }));
    console.info('Payment method ERROR', paymentMethodResponse);
    if (paymentMethodResponse.data.error) {
        throw new Error(paymentMethodResponse.data.error.message);
    }

    // Create and conymentfirm the paymenyt intent
    console.info('Payment method id', paymentMethodResponse.data.id);

    const paymentIntentResponse = await instance.post('/v1/payment_intents', qs.stringify({
        amount: 2000,  // Amount in cents, e.g., $100.00
        currency: 'usd',
        payment_method: paymentMethodResponse.data.id,
        confirm: true,
        use_stripe_sdk: true
    }));

    if (paymentIntentResponse.data.error) {
        throw new Error(paymentIntentResponse.data.error.message);
    }

    return paymentIntentResponse.data;
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
