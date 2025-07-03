import { 
    INodeType, 
    INodeTypeDescription, 
    IExecuteFunctions, 
    INodeExecutionData, 
    NodeOperationError, 
    NodeConnectionType 
} from 'n8n-workflow';
import { v4 as uuidv4 } from 'uuid';

// Simple in-memory storage for demo purposes (replace with persistent storage in production)
interface TokenData {
    access_token: string;
    token_type: string;
    expires_in: number;
    created_at: number;
    client_id: string;
    scope?: string;
}

const tokenStore: Map<string, TokenData> = new Map();

// Generate a random token
const generateToken = (): string => {
    return Buffer.from(uuidv4()).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
};

class OAuth2Provider implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'OAuth2 Provider',
        name: 'oAuth2Provider',
        icon: 'file:oAuth2.svg',
        group: ['auth'],
        version: 1,
        subtitle: '={{$parameter["operation"]}}',
        description: 'OAuth2 Provider for API Authentication',
        defaults: {
            name: 'OAuth2 Provider',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: [
            {
                name: 'oAuth2ProviderApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Generate Token',
                        value: 'generateToken',
                        description: 'Generate a new OAuth2 access token',
                        action: 'Generate a new access token',
                    },
                    {
                        name: 'Validate Token',
                        value: 'validateToken',
                        description: 'Validate an existing access token',
                        action: 'Validate an access token',
                    },
                ],
                default: 'generateToken',
            },
            {
                displayName: 'Client ID',
                name: 'clientId',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: {
                        operation: ['generateToken'],
                    },
                },
                description: 'The client ID for authentication',
            },
            {
                displayName: 'Client Secret',
                name: 'clientSecret',
                type: 'string',
                typeOptions: {
                    password: true,
                },
                required: true,
                default: '',
                displayOptions: {
                    show: {
                        operation: ['generateToken'],
                    },
                },
                description: 'The client secret for authentication',
            },
            {
                displayName: 'Token',
                name: 'token',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: {
                        operation: ['validateToken'],
                    },
                },
                description: 'The token to validate',
            },
            {
                displayName: 'Expires In (seconds)',
                name: 'expiresIn',
                type: 'number',
                default: 3600,
                displayOptions: {
                    show: {
                        operation: ['generateToken'],
                    },
                },
                description: 'Token expiration time in seconds',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const operation = this.getNodeParameter('operation', 0) as string;

        for (let i = 0; i < items.length; i++) {
            try {
                if (operation === 'generateToken') {
                    const clientId = this.getNodeParameter('clientId', i) as string;
                    // Client secret is validated but not used in this example
                    // In a real implementation, you would validate this against your client database
                    this.getNodeParameter('clientSecret', i) as string;
                    const expiresIn = this.getNodeParameter('expiresIn', i, 3600) as number;

                    // In a real implementation, you would validate the client ID and secret here
                    // For this example, we'll just generate a token
                    const accessToken = generateToken();
                    const now = Math.floor(Date.now() / 1000);
                    
                    const tokenData: TokenData = {
                        access_token: accessToken,
                        token_type: 'Bearer',
                        expires_in: expiresIn,
                        created_at: now,
                        client_id: clientId,
                    };

                    // Store the token
                    tokenStore.set(accessToken, tokenData);

                    returnData.push({
                        json: {
                            access_token: accessToken,
                            token_type: 'Bearer',
                            expires_in: expiresIn,
                            created_at: now,
                        },
                    });
                } else if (operation === 'validateToken') {
                    const token = this.getNodeParameter('token', i) as string;
                    const tokenData = tokenStore.get(token);
                    const now = Math.floor(Date.now() / 1000);

                    if (!tokenData) {
                        throw new NodeOperationError(this.getNode(), 'Invalid token');
                    }

                    const isExpired = tokenData.created_at + tokenData.expires_in < now;
                    
                    if (isExpired) {
                        tokenStore.delete(token); // Clean up expired token
                        throw new NodeOperationError(this.getNode(), 'Token has expired');
                    }

                    returnData.push({
                        json: {
                            valid: true,
                            client_id: tokenData.client_id,
                            expires_in: tokenData.created_at + tokenData.expires_in - now,
                        },
                    });
                }
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: error.message,
                        },
                    });
                    continue;
                }
                throw error;
            }
        }

        return [returnData];
    }
}

// Export the class in the format n8n expects
module.exports = { OAuth2Provider };
