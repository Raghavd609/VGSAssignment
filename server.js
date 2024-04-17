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

app.post('/process-payment', async (req, res) => {
    console.log('RECEIVED BODY:', req.body); // Log the entire body to see what is actually being sent
    const creditCardInfo = req.body;

    if (!creditCardInfo || !creditCardInfo.cc_exp) {
        console.error('Invalid or missing credit card information');
        return res.status(400).json({ error: 'Invalid or missing credit card information' });
    }

    try {
        const paymentResponse = await postStripePayment(creditCardInfo);
        res.status(200).json(paymentResponse);
    } catch (error) {
        console.error('ERROR PROCESSING PAYMENT:', error);
        res.status(500).json({ error: error.message });
    }
});

async function postStripePayment(creditCardInfo) {
    console.log('CHECKING EXPIRATION DATE:', creditCardInfo.cc_exp);
    console.log('CHECKING EXPIRATION creaditCardInfo.data:', creditCardInfo['data'].cc_exp);
    console.log('CHECKING EXPIRATION creaditCardInfo.data.cc_exp:', creditCardInfo['data'].cc_exp);
    const agent = getProxyAgent();
    const expiry = creditCardInfo.cc_exp.split('/').map(item => item.trim());
    const exp_month = expiry[0];
    const exp_year = expiry[1];

    if (isNaN(exp_month) || exp_month < 1 || exp_month > 12 || isNaN(exp_year) || exp_year.length !== 2) {
        throw new Error("Expiration date is out of range or incorrectly formatted");
    }

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
            number: creditCardInfo.cc_number,
            cvc: creditCardInfo.cc_cvv,
            exp_month: exp_month,
            exp_year: '20' + exp_year
        }
    }));

    console.log('PAYMENT METHOD RESPONSE:', pm_response.data);
    return pm_response.data;
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
