// Import nodes and credentials
const { Customer } = require('./dist/nodes/Customer/Customer.node');
const { CustomerApiKey } = require('./dist/credentials/CustomerApiKey.credentials');

module.exports = {
    nodes: [
        Customer
    ],
    credentials: {
        customerApiKey: CustomerApiKey
    }
};