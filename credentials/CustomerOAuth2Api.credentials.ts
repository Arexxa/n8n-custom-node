import {
    ICredentialType,
    NodePropertyTypes,
} from 'n8n-workflow';

export class CustomerOAuth2Api implements ICredentialType {
    name = 'customerOAuth2Api';
    displayName = 'Customer OAuth2 API';
    documentationUrl = 'https://loyaltycrmapidev.shoplink.hk/api';
    extends = [
        'oAuth2Api',
    ];
    properties = [
        {
            displayName: 'Authorization URL',
            name: 'authUrl',
            type: 'string' as NodePropertyTypes,
            default: 'https://your-auth-server.com/oauth/authorize',
            required: true,
            description: 'The URL where users will be redirected to authorize the application',
        },
        {
            displayName: 'Access Token URL',
            name: 'accessTokenUrl',
            type: 'string' as NodePropertyTypes,
            default: 'https://your-auth-server.com/oauth/token',
            required: true,
            description: 'The URL where the access token can be obtained',
        },
        {
            displayName: 'Scope',
            name: 'scope',
            type: 'string' as NodePropertyTypes,
            default: 'customer:read customer:write',
            description: 'The scope of the access request',
        },
        {
            displayName: 'Client ID',
            name: 'clientId',
            type: 'string' as NodePropertyTypes,
            default: '',
            required: true,
            description: 'The client ID provided by the OAuth2 provider',
        },
        {
            displayName: 'Client Secret',
            name: 'clientSecret',
            type: 'string' as NodePropertyTypes,
            typeOptions: {
                password: true,
            },
            default: '',
            required: true,
            description: 'The client secret provided by the OAuth2 provider',
        },
        {
            displayName: 'Auth URI Query Parameters',
            name: 'authQueryParameters',
            type: 'hidden' as NodePropertyTypes,
            default: '',
        },
        {
            displayName: 'Authentication',
            name: 'authentication',
            type: 'hidden' as NodePropertyTypes,
            default: 'header',
        },
    ];
}
