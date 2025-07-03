import type {
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

class OAuth2ProviderApi implements ICredentialType {
    name = 'oAuth2ProviderApi';
    displayName = 'OAuth2 Provider API';
    documentationUrl = 'https://docs.n8n.io/integrations/creating-nodes/build/declarative-style-node/';
    properties: INodeProperties[] = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            description: 'API key for admin operations',
        },
    ];
}

// Export the class in the format n8n expects
module.exports = { OAuth2ProviderApi };
