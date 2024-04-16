const express = require('express');
const axios = require('axios');
const tunnel = require('tunnel');
const qs = require('qs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Hardcoded path for the outbound certificate
const VGS_OUTBOUND_CERT_PATH = '/Users/raghavdave/Documents/VGSAssigment/sandbox.pem';

const VGS_VAULT_ID = 'tntkmaqsnf9';
const VGS_USERNAME = 'USpDfWz23n8FGztYxzi5RNDa';
const VGS_PASSWORD = '6563291f-aaec-49c4-b63f-45fbbc0e1fe3';
const STRIPE_KEY = 'sk_test_51Lrs6CK6opjUgeSmFHReX14eBMcbofCJrUOisGTC7ASpkfFMqD6Eysbs83qBC12YZErV3nv1Pg4UTy9WRhPRVUpQ00o7cUrV8I';

console.log(`Outbound route certificate is stored at this path: ${VGS_OUTBOUND_CERT_PATH}`);

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
        ca: VGS_OUTBOUND_CERT_PATH // Use the hardcoded certificate path
    });
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Route handler for serving the payment form
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route handler for processing payment
app.post('/process-payment', async (req, res) => {
    const creditCardInfo = req.body;
    console.log('Received credit card info:', creditCardInfo);

    try {
        let agent = getProxyAgent();

        // Send card info to payment_methods endpoint
        const pm_response = await axios.post('https://api.stripe.com/v1/payment_methods', qs.stringify({
            type: 'card',
            card: {
                number: creditCardInfo['cc_number'],
                cvc: creditCardInfo['cc_cvv'],
                exp_month: creditCardInfo['cc_exp_month'], // Assuming separate fields for month and year
                exp_year: creditCardInfo['cc_exp_year']
            }
        }), {
            headers: {
                'Authorization': `Bearer ${STRIPE_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            httpsAgent: agent,
        });
        console.log('Payment method created:', pm_response.data);

        // Use the payment method to post a payment using the payment_intents endpoint
        const pi_response = await axios.post('https://api.stripe.com/v1/payment_intents', qs.stringify({
            amount: 100, // Sample amount
            currency: 'usd',
            payment_method: pm_response.data.id,
            confirm: true
        }), {
            headers: {
                'Authorization': `Bearer ${STRIPE_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            httpsAgent: agent,
        });
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