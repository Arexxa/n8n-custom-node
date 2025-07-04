import {
    ICredentialType,
    NodePropertyTypes,
} from 'n8n-workflow';

export class CustomerApiKey implements ICredentialType {
    name = 'customerApiKey';
    displayName = 'Customer API Key';
    documentationUrl = 'https://loyaltycrmapidev.shoplink.hk/api';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string' as NodePropertyTypes,
            typeOptions: {
                password: true,
            },
            default: '',
            required: true,
            description: 'The API key required to access this node',
        },
        {
            displayName: 'API Key Validation',
            name: 'apiKeyValidation',
            type: 'options' as NodePropertyTypes,
            options: [
                {
                    name: 'Exact Match',
                    value: 'exact',
                    description: 'API key must match exactly',
                },
                {
                    name: 'Starts With',
                    value: 'startsWith',
                    description: 'API key must start with this value',
                },
                {
                    name: 'Contains',
                    value: 'contains',
                    description: 'API key must contain this value',
                },
            ],
            default: 'exact',
            description: 'How to validate the API key',
        },
        {
            displayName: 'Base URL',
            name: 'baseUrl',
            type: 'string' as NodePropertyTypes,
            default: 'https://loyaltycrmapidev.shoplink.hk/api/crm',
            required: true,
            description: 'The base URL for the API',
        },
    ];
}
