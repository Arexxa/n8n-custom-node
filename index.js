// Import nodes
const NasaPicsNode = require('./dist/nodes/NasaPics/NasaPics.node.js');
const OAuth2ProviderNode = require('./dist/nodes/OAuth2/OAuth2Provider.node.js');
const CustomerNode = require('./dist/nodes/Customer/Customer.node.js');

// Import credentials
const OAuth2ProviderApiCredentials = require('./dist/credentials/OAuth2ProviderApi.credentials.js');
const CustomerApi = require('./dist/credentials/CustomerApi.credentials.js');

module.exports = {
    nodes: [
        NasaPicsNode,
        OAuth2ProviderNode,
        CustomerNode,
    ],
    credentials: [
        OAuth2ProviderApiCredentials,
        CustomerApi,
    ],
};