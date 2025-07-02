// Import nodes
import { NasaPicsNode } from './dist/nodes/NasaPics/NasaPics.node.js';
import { OAuth2Node } from './dist/nodes/OAuth2/OAuth2.node.js';
import { CustomerNode } from './dist/nodes/Customer/Customer.node.js';

// Import credentials
import { OAuth2CustomApi } from './dist/credentials/OAuth2Api.credentials.js';
import { CustomerApi } from './dist/credentials/CustomerApi.credentials.js';

export default {
    nodes: [
        NasaPicsNode,
        OAuth2Node,
        CustomerNode,
    ],
    credentials: [
        OAuth2CustomApi,
        CustomerApi,
    ],
};