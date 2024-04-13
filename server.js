const express = require('express');
const stripe = require('stripe')('sk_test_51Lrs6CK6opjUgeSmFHReX14eBMcbofCJrUOisGTC7ASpkfFMqD6Eysbs83qBC12YZErV3nv1Pg4UTy9WRhPRVUpQ00o7cUrV8I');
const cors = require('cors');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors()); // Enable CORS for all domains
app.use(express.json()); // Middleware for parsing JSON bodies

// Serve static files from 'public' directory where your HTML file is located
app.use(express.static('public'));

// Optional: Specific route to serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/process-payment', async (req, res) => {
    const tokenizedData = req.body;
    console.log('Received tokenized data:', tokenizedData);

    try {
        const username = 'example12@motterblue.com';
        const password = 'pirvUk-vigpeh-pinnu6';
        const auth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64');

        console.log('Making outbound call');
        const vgsResponse = await fetch('https://tntkmaqsnf9.sandbox.verygoodproxy.com:8443', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': auth
            },
            body: JSON.stringify(tokenizedData)
        });

        if (!vgsResponse.ok) {
            console.error('Failed to de-tokenize data:', await vgsResponse.text());
            return res.status(500).send('Failed to process payment');
        }

        const cardDetails = await vgsResponse.json();
        console.log('De-tokenized card details received:', cardDetails);

        // Create a payment method with Stripe
        const paymentMethod = await stripe.paymentMethods.create({
            type: 'card',
            card: {
                number: cardDetails.cc_number,
                exp_month: parseInt(cardDetails.cc_exp.split('/')[0]),
                exp_year: parseInt(cardDetails.cc_exp.split('/')[1]),
                cvc: cardDetails.cc_cvv
            }
        });
        console.log('Payment method created:', paymentMethod.id);

        // Create and confirm a payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 2000, // Amount in cents, e.g., $20.00
            currency: 'usd',
            payment_method: paymentMethod.id,
            confirmation_method: 'automatic',
            confirm: true
        });
        console.log('Payment intent processed:', paymentIntent.id);

        res.status(200).send('Payment processed successfully');
    } catch (error) {
        console.error('Error during payment processing:', error);
        res.status(500).send('An error occurred during payment processing');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});