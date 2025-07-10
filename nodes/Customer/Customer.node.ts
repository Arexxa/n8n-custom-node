// nodes/Customer/Customer.node.ts
import {
    IDataObject,
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';
import { apiRequest } from '../GenericFunctions';

export class Customer implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'ShopLink Customer',
        name: 'customer',
        icon: 'file:customer.svg',
        group: ['output'],
        version: 1,
        description: 'Interact with Customer API',
        defaults: {
            name: 'Customer',
            color: '#1A82e2',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'customerOAuth2Api',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                options: [
                    {
                        name: 'Customer',
                        value: 'customer',
                    },
                ],
                default: 'customer',
                description: 'The resource to operate on',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                displayOptions: {
                    show: {
                        resource: ['customer'],
                    },
                },
                options: [
                    {
                        name: 'Get',
                        value: 'get',
                        description: 'Get a customer by ID',
                        action: 'Get a customer',
                    },
                    {
                        name: 'Get All',
                        value: 'getAll',
                        description: 'Get all customers',
                        action: 'Get all customers',
                    },
                ],
                default: 'getAll',
                description: 'The operation to perform',
            },
            {
                displayName: 'Customer ID',
                name: 'customerId',
                type: 'string',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['customer'],
                        operation: ['get'],
                    },
                },
                default: '',
                description: 'The ID of the customer to retrieve',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: IDataObject[] = [];
        const resource = this.getNodeParameter('resource', 0) as string;
        const operation = this.getNodeParameter('operation', 0) as string;
        let responseData: any;

        console.log(`Executing ${resource}.${operation}`);

        for (let i = 0; i < items.length; i++) {
            try {
                if (resource === 'customer') {
                    if (operation === 'getAll') {
                        console.log('Fetching all customers...');
                        responseData = await apiRequest.call(this, 'GET', '/crm/appcustomers/demo');
                        
                        // Handle different response formats
                        if (responseData && responseData.data && Array.isArray(responseData.data)) {
                            // If response has a data array
                            returnData.push(...responseData.data);
                        } else if (Array.isArray(responseData)) {
                            // If response is directly an array
                            returnData.push(...responseData);
                        } else if (responseData && typeof responseData === 'object') {
                            // If response is a single object
                            returnData.push(responseData);
                        } else {
                            console.warn('Unexpected response format:', responseData);
                            returnData.push({ warning: 'Unexpected response format', data: responseData });
                        }
                    } else if (operation === 'get') {
                        const customerId = this.getNodeParameter('customerId', i) as string;
                        console.log(`Fetching customer with ID: ${customerId}`);
                        responseData = await apiRequest.call(this, 'GET', `/crm/appcustomer/demo/${customerId}`);
                        
                        // Handle the response data
                        if (responseData && responseData.data) {
                            returnData.push(responseData.data);
                        } else if (responseData) {
                            returnData.push(responseData);
                        } else {
                            returnData.push({ error: 'No data received' });
                        }
                    }
                } else {
                    throw new Error(`Operation '${operation}' is not supported.`);
                }
            } catch (error: any) {
                console.error(`Error in item ${i + 1}:`, error);
                if (this.continueOnFail()) {
                    returnData.push({ 
                        error: error.message,
                        stack: error.stack,
                        response: error.response?.data || 'No response data'
                    });
                    continue;
                }
                throw error;
            }
        }

        // Map data to n8n data structure
        const executionData: INodeExecutionData[] = returnData.map((item: IDataObject) => ({
            json: item,
            binary: {},
            pairedItem: {
                item: 0,
            },
        }));

        return [executionData];
    }
}