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

    // Accessing the data directly from req.body.json assuming your log prints out req.body
    const creditCardData = req.body.json;

    if (!creditCardData || !creditCardData.cc_exp || !creditCardData.cc_number || !creditCardData.cc_cvv) {
        console.error('Invalid or missing credit card information');
        return res.status(400).json({ error: 'Invalid or missing credit card information' });
    }

    console.log('Checking Expiration Date:', creditCardData.cc_exp);
    const expiry = creditCardData.cc_exp.split('/');
    const exp_month = expiry[0]; // Correctly scope exp_month
    const exp_year = expiry[1]; // Correctly scope exp_year

    if (isNaN(exp_month) || exp_month < 1 || exp_month > 12 || isNaN(exp_year) || exp_year.length !== 2) {
        return res.status(400).json({ error: "Expiration date is out of range or incorrectly formatted" });
    }

    try {
        const tokenizedData = await tokenizeCreditCardData(creditCardData);
        console.log('Tokenized Data:', tokenizedData);
        const paymentResponse = await postStripePayment(tokenizedData, exp_month, exp_year);
        res.status(200).json(paymentResponse);
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({ error: error.message });
    }
});

async function tokenizeCreditCardData(creditCardData) {
    console.log('STEP 1: OUTBOUND - SENDING CREDIT CARD DATA TO VGS:', creditCardData);
    const vgsResponse = await axios.post('https://tntkmaqsnf9.sandbox.verygoodproxy.com/post', creditCardData, {
        headers: {
            'Content-Type': 'application/json'
        }
    });
    console.log('STEP 2: OUTBOUND - RECEIVED TOKENIZED DATA FROM VGS:', vgsResponse.data);
    return vgsResponse.data;
}

async function postStripePayment(creditCardData, exp_month, exp_year) {
    const instance = axios.create({
        baseURL: 'https://api.stripe.com',
        headers: {
            'Authorization': `Basic ${Buffer.from('YOUR_STRIPE_SECRET_KEY').toString('base64')}`,
        }
    });

    console.log('STEP 3: OUTBOUND - SENDING TOKENIZED DATA TO STRIPE:', creditCardData);
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
