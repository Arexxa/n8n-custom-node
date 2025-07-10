const { Customer } = require('./dist/nodes/Customer/Customer.node');
// Import the credentials - TypeScript exports them as default
const { CustomerApiKey } = require('./dist/credentials/CustomerApiKey.credentials');
const { CustomerOAuth2 } = require('./dist/credentials/CustomerOAuth2.credentials');

module.exports = {
    nodes: [
        Customer
    ],
    credentials: [
        CustomerApiKey,
        CustomerOAuth2
    ]
};