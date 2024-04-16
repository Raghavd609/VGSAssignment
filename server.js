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

// Middleware to log incoming data from the front end
app.use((req, res, next) => {
    console.log('Incoming data from front end:', req.body);
    next();
});

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

// Route to process payment
app.post('/process-payment', async (req, res) => {
    console.log('Received tokenized payment data:', req.body);

    try {
        // Get proxy agent for VGS Outbound Route
        const agent = getProxyAgent();

        // Extract tokenized credit card data
        const { cc_number, cc_exp, cc_cvv } = req.body;

        // Prepare data to be sent to Stripe
        const paymentData = {
            card: {
                number: cc_number,
                exp_month: cc_exp.split('/')[0].trim(),
                exp_year: cc_exp.split('/')[1].trim(),
                cvc: cc_cvv
            }
        };

        // Send tokenized payment data to Stripe via VGS Outbound Route
        const stripeResponse = await axios.post('https://api.stripe.com/v1/payment_methods', qs.stringify(paymentData), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Bearer sk_test_4eC39HqLyjWDarjtT1zdp7dc'
            },
            httpsAgent: agent
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
            },
            httpsAgent: agent
        });

        console.log('Payment Intent Response:', paymentIntentResponse.data);

        // Further processing steps...

        // Return success response to frontend
        res.status(200).json({ message: 'Payment processed successfully' });
    } catch (error) {
        console.error('Error processing payment:', error.message);
        res.status(500).json({ error: 'An error occurred while processing payment.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});