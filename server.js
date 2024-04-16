const express = require('express');
const axios = require('axios');
const tunnel = require('tunnel');
const qs = require('qs');

const app = express();
const PORT = process.env.PORT || 3000;

const VGS_VAULT_ID = 'tntkmaqsnf9';
const VGS_USERNAME = 'USpDfWz23n8FGztYxzi5RNDa';
const VGS_PASSWORD = '6563291f-aaec-49c4-b63f-45fbbc0e1fe3';
const STRIPE_KEY = 'sk_test_51Lrs6CK6opjUgeSmFHReX14eBMcbofCJrUOisGTC7ASpkfFMqD6Eysbs83qBC12YZErV3nv1Pg4UTy9WRhPRVUpQ00o7cUrV8I';

console.log(`Outbound route certificate is stored at this path: ${process.env['NODE_EXTRA_CA_CERTS']}`);

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

app.use(express.json());

app.post('/process-payment', async (req, res) => {
    const creditCardInfo = req.body;
    console.log('Received credit card info:', creditCardInfo);

    try {
        let agent = getProxyAgent();
        let expiry = creditCardInfo['cc_exp'].split('/');

        const instance = axios.create({
            baseURL: 'https://api.stripe.com',
            headers: {
                'Authorization': `Bearer ${STRIPE_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            httpsAgent: agent,
        });

        let pm_response = await instance.post('/v1/payment_methods', qs.stringify({
            type: 'card',
            card: {
                number: creditCardInfo['cc_number'],
                cvc: creditCardInfo['cc_cvv'],
                exp_month: expiry[0].trim(),
                exp_year: expiry[1].trim()
            }
        }));
        console.log('Payment method created:', pm_response.data);

        let pi_response = await instance.post('/v1/payment_intents', qs.stringify({
            amount: 100,
            currency: 'usd',
            payment_method: pm_response.data.id,
            confirm: true
        }));
        console.log('Payment intent processed:', pi_response.data);

        res.status(200).send('Payment processed successfully');
    } catch (error) {
        console.error('Error during payment processing:', error);
        res.status(500).send('An error occurred during payment processing');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});