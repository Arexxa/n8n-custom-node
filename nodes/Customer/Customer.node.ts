import {
    IExecuteFunctions,
    INodeType,
    INodeTypeDescription,
    IDataObject,
    INodeExecutionData,
} from 'n8n-workflow';

class Customer implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'ShopLink Customer',
        name: 'customer',
        icon: 'file:customer.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Interact with ShopLink Customer API',
        defaults: {
            name: 'ShopLink Customer',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'customerApiKey',
                required: true,
            },
        ],
        requestDefaults: {
            baseURL: 'https://loyaltycrmapidev.shoplink.hk/api/crm',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        },
        properties: [
            {
                displayName: 'API Key',
                name: 'apiKey',
                type: 'string',
                required: true,
                default: '',
                description: 'The API key to authenticate with the node',
                displayOptions: {
                    show: {
                        resource: ['customer'],
                    },
                },
            },
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Customer',
                        value: 'customer',
                    },
                ],
                default: 'customer',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['customer'],
                    },
                },
                options: [
                    {
                        name: 'Get',
                        value: 'get',
                        action: 'Get a customer',
                        description: 'Get a customer by ID',
                        routing: {
                            request: {
                                method: 'GET',
                                url: '=/appcustomer/demo/{{$parameter.customerId}}',
                            },
                        },
                    },
                    {
                        name: 'Get All',
                        value: 'getAll',
                        action: 'Get all customers',
                        description: 'Get all customers',
                        routing: {
                            request: {
                                method: 'GET',
                                url: '/appcustomers/demo',
                            },
                        },
                    },
                ],
                default: 'get',
            },
            {
                displayName: 'Customer ID',
                name: 'customerId',
                type: 'string',
                default: '',
                description: 'The ID of the customer to retrieve',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['get'],
                    },
                },
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: IDataObject[] = [];
        const length = items.length;
        let responseData;

        for (let i = 0; i < length; i++) {
            try {
                const operation = this.getNodeParameter('operation', i) as string;
                const resource = this.getNodeParameter('resource', i) as string;

                if (resource === 'customer') {
                    // Get credentials
                    const credentials = await this.getCredentials('customerApiKey');
                    const baseUrl = credentials.baseUrl || 'https://loyaltycrmapidev.shoplink.hk/api/crm';
                    const expectedApiKey = credentials.apiKey as string;
                    const apiKeyValidation = (credentials.apiKeyValidation as 'exact' | 'startsWith' | 'contains') || 'exact';
                    
                    // Get the API key from the request headers or query parameters
                    const requestApiKey = this.getNodeParameter('apiKey', i, '') as string;
                    
                    // Validate the API key
                    let isValid = false;
                    
                    switch (apiKeyValidation) {
                        case 'exact':
                            isValid = requestApiKey === expectedApiKey;
                            break;
                            
                        case 'startsWith':
                            isValid = requestApiKey.startsWith(expectedApiKey);
                            break;
                            
                        case 'contains':
                            isValid = requestApiKey.includes(expectedApiKey);
                            break;
                    }
                    
                    if (!isValid) {
                        throw new Error('Invalid API key');
                    }
                    
                    // Log the validation (without exposing the actual keys)
                    this.logger.debug(`API Key validation: ${isValid ? 'SUCCESS' : 'FAILED'}`);
                    
                    // Set up request options
                    const requestOptions: any = {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                        },
                        json: true,
                        baseURL: baseUrl,
                        validateStatus: (status: number) => {
                            this.logger.debug(`Request status: ${status}`);
                            return true; // Always resolve the promise to handle errors manually
                        }
                    };

                    try {
                        // Handle different operations
                        if (operation === 'get') {
                            const customerId = this.getNodeParameter('customerId', i) as string;
                            requestOptions.uri = `/appcustomer/demo/${customerId}`;
                            this.logger.debug(`Making GET request to: ${requestOptions.uri}`);
                            
                            const response = await this.helpers.request.call(this, requestOptions);
                            this.logger.debug('Response received', { statusCode: response.statusCode });
                            
                            if (response.statusCode === 401) {
                                throw new Error('Authentication failed. Please check your API key and try again.');
                            }
                            
                            responseData = response.body || response;
                        } else if (operation === 'getAll') {
                            requestOptions.uri = '/appcustomers/demo';
                            this.logger.debug(`Making GET request to: ${requestOptions.uri}`);
                            
                            const response = await this.helpers.request.call(this, requestOptions);
                            this.logger.debug('Response received', { statusCode: response.statusCode });
                            
                            if (response.statusCode === 401) {
                                throw new Error('Authentication failed. Please check your API key and try again.');
                            }
                            
                            responseData = response.body || response;
                        }
                    } catch (error) {
                        this.logger.error('Request failed', { error });
                        throw error;
                    }

                    // Process response
                    if (Array.isArray(responseData)) {
                        returnData.push(...responseData);
                    } else if (responseData !== undefined) {
                        returnData.push(responseData);
                    }
                }
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ error: error.message });
                    continue;
                }
                throw error;
            }
        }

        return [this.helpers.returnJsonArray(returnData)];
    }
}

// Export the class in the format n8n expects
module.exports = { Customer };