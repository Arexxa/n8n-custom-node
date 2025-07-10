import * as dotenv from 'dotenv';
import {
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

// Load environment variables
dotenv.config();

export class CustomerOAuth2 implements ICredentialType {
    name = 'customerOAuth2Api';
    extends = ['oAuth2Api'];
    displayName = 'Customer OAuth2 API';
    documentationUrl = 'http://localhost:3000/docs';
    properties: INodeProperties[] = [
        {
            displayName: 'Grant Type',
            name: 'grantType',
            type: 'hidden',
            default: 'clientCredentials',
        },
        {
            displayName: 'Client ID',
            name: 'clientId',
            type: 'string',
            default: '',
            required: true,
            description: 'Enter the client ID (e.g., shoplink-client)',
        },
        {
            displayName: 'Client Secret',
            name: 'clientSecret',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            required: true,
            description: 'Enter the client secret (exactly as in your .env file)',
        },
        {
            displayName: 'Auth URI',
            name: 'authUrl',
            type: 'string',
            default: 'http://localhost:3000/oauth/authorize',
            required: true,
        },
        {
            displayName: 'Access Token URL',
            name: 'accessTokenUrl',
            type: 'string',
            default: 'http://localhost:3000/oauth/token',
            required: true,
        },
        {
            displayName: 'Token Validation URL',
            name: 'authTokenUrl',
            type: 'string',
            default: 'http://localhost:3000/oauth/validate',
            required: true,
        },
        {
            displayName: 'Authorization URL Query Parameters',
            name: 'authQueryParameters',
            type: 'hidden',
            default: '={}',
        },
        {
            displayName: 'Authentication',
            name: 'authentication',
            type: 'hidden',
            default: 'header',
        },
        {
            displayName: 'Client Authentication',
            name: 'clientAuthentication',
            type: 'options',
            options: [
                {
                    name: 'Send as Basic Auth Header',
                    value: 'header',
                },
                {
                    name: 'Send Client Credentials in Body',
                    value: 'body',
                },
            ],
            default: 'header',
        },
        {
            displayName: 'Scope',
            name: 'scope',
            type: 'hidden',
            default: 'read write',
            description: 'Space-separated list of scopes',
            required: true,
        },
        {
            displayName: 'Auth URI Query Parameters',
            name: 'authQueryParameters',
            type: 'hidden',
            default: '',
        },
        {
            displayName: 'Authentication',
            name: 'authentication',
            type: 'hidden',
            default: 'header',
            description: 'How to send the token in the request',
        },
        {
            displayName: 'Auth Data',
            name: 'authData',
            type: 'hidden',
            default: '={}',
            description: 'OAuth2 authentication data',
            required: true,
        },
        {
            displayName: 'Client Authentication',
            name: 'clientAuthentication',
            type: 'options',
            options: [
                {
                    name: 'Send as Basic Auth Header',
                    value: 'header',
                },
                {
                    name: 'Send Client Credentials in Body',
                    value: 'body',
                },
            ],
            default: 'header',
            description: 'How to send the client credentials',
        },
    ];
}