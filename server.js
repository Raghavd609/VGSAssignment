const express = require('express');
const axios = require('axios');
const tunnel = require('tunnel');
const qs = require('querystring');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

console.log(`Outbound route certificate is stored at this path: ${process.env['NODE_EXTRA_CA_CERTS']}`);

// Function to get proxy agent for VGS Outbound Route
function getProxyAgent() {
    const VGS_VAULT_ID = 'tntkmaqsnf9';
    const VGS_USERNAME = 'USpDfWz23n8FGztYxzi5RNDa';
    const VGS_PASSWORD = '6563291f-aaec-49c4-b63f-45fbbc0e1fe3';
    const vgs_outbound_url = `${VGS_VAULT_ID}.sandbox.verygoodproxy.com`;
    console.log(`Sending request through outbound Route: ${vgs_outbound_url}`);

    // Create a tunneling agent for HTTPS requests
    const agent = tunnel.httpsOverHttps({
        proxy: {
            servername: vgs_outbound_url,
            host: vgs_outbound_url,
            port: 8443,
            proxyAuth: `${VGS_USERNAME}:${VGS_PASSWORD}`
        },
    });

    // Log connection status
    agent.on('connect', () => {
        console.log('Connection to VGS established successfully.');
    });

    agent.on('error', (error) => {
        console.error('Error establishing connection to VGS:', error.message);
    });

    return agent;
}

// Middleware to log incoming data from the front end and send it through VGS Outbound Route
app.post('/process-payment', async (req, res, next) => {
    console.log('Incoming data from front end:', req.body);

    try {
        // Get proxy agent for VGS Outbound Route
        const agent = getProxyAgent();

        // Send tokenized payment data to VGS Outbound Route
        const vgsResponse = await axios.post('https://tntkmaqsnf9.sandbox.verygoodproxy.com/post', req.body, {
            httpsAgent: agent
        });

        // Log VGS response
        console.log('VGS Response:', vgsResponse.data);

        // Pass control to the next middleware
        next();
    } catch (error) {
        console.error('Error processing payment:', error.message);
        res.status(500).json({ error: 'An error occurred while processing payment.' });
    }
});

// Route to process payment after tokenization
app.post('/process-payment', async (req, res) => {
    try {
        // Extract tokenized credit card data
        const { cc_number, cc_exp, cc_cvv } = req.body;

        // Check if the cc_exp is in the expected format
        if (cc_exp && cc_exp.length === 7) {
            let expiryMonth = parseInt(cc_exp.substring(11, 13)); // Extract month part and parse as integer
            let expiryYear = parseInt('20' + cc_exp.substring(8, 10)); // Extract year part and parse as integer

            const paymentData = {
                card: {
                    number: cc_number,
                    exp_month: expiryMonth,
                    exp_year: expiryYear,
                    cvc: cc_cvv
                }
            };

            // Send tokenized payment data to Stripe
            const stripeResponse = await axios.post('https://api.stripe.com/v1/payment_methods', qs.stringify(paymentData), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Bearer sk_test_4eC39HqLyjWDarjtT1zdp7dc'
                }
            });

            console.log('Stripe Response:', stripeResponse.data);

            // Process payment intent
            const paymentIntentResponse = await axios.post('https://api.stripe.com/v1/payment_intents', qs.stringify({
                amount: 2000, // Example amount in cents ($20.00)
                currency: 'usd',
                payment_method: stripeResponse.data.id,
                confirm: true
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Bearer sk_test_4eC39HqLyjWDarjtT1zdp7dc'
                }
            });

            console.log('Payment Intent Response:', paymentIntentResponse.data);

            // Return success response to frontend
            res.status(200).json({ message: 'Payment processed successfully' });
        } else {
            throw new Error('Invalid cc_exp format');
        }
    } catch (error) {
        console.error('Error processing payment:', error.message);
        res.status(500).json({ error: 'An error occurred while processing payment.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});