const express = require('express');
const axios = require('axios');
const tunnel = require('tunnel');
const qs = require('qs');
const path = require('path');

// Set the environment variable directly in your backend code
process.env.NODE_EXTRA_CA_CERTS = path.join(__dirname, 'outbound-route-sandbox.pem');

const app = express();
const PORT = process.env.PORT || 3000;

const VGS_VAULT_ID = 'tntkmaqsnf9';
const VGS_USERNAME = 'USpDfWz23n8FGztYxzi5RNDa';
const VGS_PASSWORD = '6563291f-aaec-49c4-b63f-45fbbc0e1fe3';
const STRIPE_KEY = 'sk_test_51Lrs6CK6opjUgeSmFHReX14eBMcbofCJrUOisGTC7ASpkfFMqD6Eysbs83qBC12YZErV3nv1Pg4UTy9WRhPRVUpQ00o7cUrV8E';

console.log(`Outbound route certificate is stored at this path: ${process.env.NODE_EXTRA_CA_CERTS}`);

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

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Route handler for processing payment
app.post('/process-payment', async (req, res) => {
    const creditCardInfo = req.body;
    console.log('Received credit card info:', creditCardInfo);

    try {
        let agent = getProxyAgent();

        const instance = axios.create({
            baseURL: 'https://api.stripe.com',
            headers: {
                'Authorization': `Bearer ${STRIPE_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            httpsAgent: agent,
        });

        // Send card info to payment_methods endpoint
        const pm_request_data = qs.stringify({
            type: 'card',
            card: {
                number: creditCardInfo['cc_number'],
                cvc: creditCardInfo['cc_cvv'],
                exp_month: creditCardInfo['cc_exp_month'], // Assuming separate fields for month and year
                exp_year: creditCardInfo['cc_exp_year']
            }
        });

        console.log('Sending request to Stripe Payment Methods API:', pm_request_data);

        const pm_response = await instance.post('/v1/payment_methods', pm_request_data);
        console.log('Payment method created:', pm_response.data);

        // Use the payment method to post a payment using the payment_intents endpoint
        const pi_request_data = qs.stringify({
            amount: 100, // Sample amount
            currency: 'usd',
            payment_method: pm_response.data.id,
            confirm: true
        });

        console.log('Sending request to Stripe Payment Intents API:', pi_request_data);

        const pi_response = await instance.post('/v1/payment_intents', pi_request_data);
        console.log('Payment intent processed:', pi_response.data);

        res.status(200).send('Payment processed successfully');
    } catch (error) {
        console.error('Error during payment processing:', error);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
        }
        res.status(500).send('An error occurred during payment processing');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});