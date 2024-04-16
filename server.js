const express = require('express');
const axios = require('axios');
const tunnel = require('tunnel');
const qs = require('querystring');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

console.log(`Outbound route certificate is stored at this path: ${process.env['NODE_EXTRA_CA_CERTS']}`);

// Middleware to log incoming data from the front end
app.use((req, res, next) => {
    console.log('Incoming data from front end:', req.body);
    next();
});

function getProxyAgent() {
    const VGS_VAULT_ID = 'tntkmaqsnf9'; // Your VGS Vault ID
    const VGS_USERNAME = 'USpDfWz23n8FGztYxzi5RNDa'; // Your VGS Username
    const VGS_PASSWORD = '6563291f-aaec-49c4-b63f-45fbbc0e1fe3'; // Your VGS Password
    const vgs_outbound_url = `${VGS_VAULT_ID}.sandbox.verygoodproxy.com`
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
    console.log('Received tokenized payment data:', req.body);

    try {
        // Forward tokenized payment data to VGS for detokenization
        const vgsResponse = await axios.post('https://tntkmaqsnf9.sandbox.verygoodproxy.com/post', req.body, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Detokenized data received from VGS:', vgsResponse.data);

        // Process payment using detokenized data
        const stripe = require('stripe')('sk_test_4eC39HqLyjWDarjtT1zdp7dc');
        console.log('Creating payment method with detokenized card data:', vgsResponse.data);
        const paymentMethod = await stripe.paymentMethods.create({
            type: 'card',
            card: vgsResponse.data, // Use detokenized card data received from VGS
        });

        console.log('Payment method created:', paymentMethod);

        // Create payment intent using payment method
        console.log('Creating payment intent with payment method:', paymentMethod.id);
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 2000,
            currency: 'usd',
            payment_method: paymentMethod.id, // Use the ID of the created payment method
            confirm: true, // Confirm the payment immediately
        });

        console.log('Payment intent created:', paymentIntent);

        res.status(200).json({ message: 'Payment processed successfully' });
    } catch (error) {
        console.error('Error processing payment:', error.message);
        res.status(500).json({ error: 'An error occurred while processing payment.' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});