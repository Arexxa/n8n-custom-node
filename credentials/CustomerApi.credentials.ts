import {
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class CustomerApi implements ICredentialType {
    name = 'customerApi';
    displayName = 'Customer API';
    documentationUrl = 'https://loyaltycrmapidev.shoplink.hk/api';
    properties: INodeProperties[] = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            required: false,
            description: 'Optional API key for authentication (leave empty if not required)',
        },
    ];
}