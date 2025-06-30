// Import nodes
import { NasaPicsNode } from './dist/nodes/NasaPics/NasaPics.node.js';
import { OAuth2Node } from './dist/nodes/OAuth2/OAuth2.node.js';

// Import credentials
import { OAuth2CustomApi } from './dist/credentials/OAuth2Api.credentials.js';

export default {
    nodes: [
        NasaPicsNode,
        OAuth2Node,
    ],
    credentials: [
        OAuth2CustomApi,
    ],
};