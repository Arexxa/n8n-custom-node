import {
    IExecuteFunctions,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
    IDataObject,
    INodeExecutionData,
} from 'n8n-workflow';

export class Customer implements INodeType {
    constructor() {}

    description: INodeTypeDescription = {
        displayName: 'ShopLink Customer',
        name: 'customer',
        icon: 'file:customer.svg',
        group: ['shoplink'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Interact with ShopLink Customer API',
        defaults: {
            name: 'ShopLink Customer',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: [
            {
                name: 'customerApi',
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
                                url: '=/appcustomers/{{$parameter.customerId}}',
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
                    const credentials = await this.getCredentials('customerApi');

                    // Set up request options with authentication
                    const requestOptions: any = {
                        method: 'GET',
                        headers: {},
                        json: true,
                    };

                    // Add API key to headers if provided
                    if (credentials?.apiKey) {
                        requestOptions.headers['Authorization'] = `Bearer ${credentials.apiKey}`;
                    }

                    // Handle different operations
                    if (operation === 'get') {
                        const customerId = this.getNodeParameter('customerId', i) as string;
                        requestOptions.uri = `/appcustomers/${customerId}`;
                        responseData = await this.helpers.request.call(this, requestOptions);
                    } else if (operation === 'getAll') {
                        requestOptions.uri = '/appcustomers/demo';
                        responseData = await this.helpers.request.call(this, requestOptions);
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

export const CustomerNode = new Customer();