const express = require('express');
const axios = require('axios');
const qs = require('qs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/process-payment', async (req, res) => {
    console.log('Received request:', req.body);

    // Attempt to parse the data if it's a string, otherwise use it directly if it's already an object
    const creditCardData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
    

    if (!creditCardData || !creditCardData.cc_exp || !creditCardData.cc_number || !creditCardData.cc_cvv) {
        console.error('Invalid or missing credit card information');
        return res.status(400).json({ error: 'Invalid or missing credit card information' });
    }

    console.log('Checking Expiration Date:', creditCardData.cc_exp);
    const expiry = creditCardData.cc_exp.split('/');
    const exp_month = expiry[0];
    const exp_year = expiry[1];

    if (isNaN(exp_month) || exp_month < 1 || exp_month > 12 || isNaN(exp_year) || exp_year.length !== 2) {
        return res.status(400).json({ error: "Expiration date is out of range or incorrectly formatted" });
    }

    try {
        const paymentResponse = await postStripePayment(creditCardData);
        res.status(200).json(paymentResponse);
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({ error: error.message });
    }
});

async function postStripePayment(creditCardData) {
    const instance = axios.create({
        baseURL: 'https://api.stripe.com',
        headers: {
            'Authorization': `Basic ${Buffer.from('YOUR_STRIPE_SECRET_KEY').toString('base64')}`,
        }
    });

    const pm_response = await instance.post('/v1/payment_methods', qs.stringify({
        type: 'card',
        card: {
            number: creditCardData.cc_number,
            cvc: creditCardData.cc_cvv,
            exp_month: exp_month,
            exp_year: '20' + exp_year
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
