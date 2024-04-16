const axios = require('axios');
const tunnel = require('tunnel');
const qs = require('qs');

const STRIPE_KEY = 'sk_test_51Lrs6CK6opjUgeSmFHReX14eBMcbofCJrUOisGTC7ASpkfFMqD6Eysbs83qBC12YZErV3nv1Pg4UTy9WRhPRVUpQ00o7cUrV8I';
const VGS_VAULT_ID = 'tntkmaqsnf9';
const VGS_USERNAME = 'USpDfWz23n8FGztYxzi5RNDa';
const VGS_PASSWORD = '6563291f-aaec-49c4-b63f-45fbbc0e1fe3';

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

async function postStripePayment(creditCardInfo) {
    console.log('Payment data:', creditCardInfo);

    let agent = getProxyAgent();
    let expiry = creditCardInfo['card-expiration-date'].split('/');

    const instance = axios.create({
        baseURL: 'https://api.stripe.com',
        headers: {
            'Authorization': `Bearer ${STRIPE_KEY}`,
        },
        httpsAgent: agent,
    });

    try {
        let pm_data = {
            type: 'card',
            card: {
                number: creditCardInfo['card-number'],
                cvc: creditCardInfo['card-security-code'],
                exp_month: expiry[0].trim(),
                exp_year: expiry[1].trim()
            }
        };
        console.log('Creating payment method with data:', pm_data);

        let pm_response = await instance.post('/v1/payment_methods', qs.stringify(pm_data));
        console.log('Payment method created:', pm_response.data);

        let pi_data = {
            amount: 100,
            currency: 'usd',
            payment_method: pm_response.data.id,
            confirm: true
        };
        console.log('Creating payment intent with data:', pi_data);

        let pi_response = await instance.post('/v1/payment_intents', qs.stringify(pi_data));
        console.log('Payment intent created:', pi_response.data);
        
        return pi_response.data;
    } catch (error) {
        console.error('Error occurred:', error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = postStripePayment;