import {
    IHookFunctions,
    IExecuteFunctions,
    ILoadOptionsFunctions,
    IWebhookFunctions,
    IHttpRequestMethods,
    IDataObject,
    NodeOperationError,
    NodeApiError,
    IRequestOptions,
} from 'n8n-workflow';

export async function apiRequest(
    this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
    method: IHttpRequestMethods,
    endpoint: string,
    body: any = {},
    qs: IDataObject = {},
    uri?: string,
    options: IRequestOptions = {},
): Promise<any> {
    try {
        // Use the external API endpoint with /api prefix
        const baseUrl = 'https://loyaltycrmapidev.shoplink.hk/api';
        
        // Ensure the endpoint starts with a slash
        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        
        // The full URL to the external API - include /api in the base URL
        const url = uri || `${baseUrl}${path}`;
        
        console.log('=== API REQUEST ===');
        console.log('Method:', method);
        console.log('URL:', url);
        console.log('Query Params:', JSON.stringify(qs, null, 2));
        if (Object.keys(body).length > 0) {
            console.log('Body:', JSON.stringify(body, null, 2));
        }
        
        // Prepare request options without spreading options yet to avoid duplicates
        const requestOptions: any = {
            method,
            url,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            qs,
            // Don't include body here yet to avoid duplicates
        };

        // Add body if present
        if (Object.keys(body).length > 0) {
            requestOptions.body = body;
            requestOptions.json = true;
        }

        // Now merge with options, but exclude headers that were already set
        const { headers: optionsHeaders, ...restOptions } = options || {};
        const finalOptions = {
            ...restOptions,
            ...requestOptions,
            headers: {
                ...requestOptions.headers,
                ...optionsHeaders,
            },
        };

        console.log('=== REQUEST OPTIONS ===');
        console.log(JSON.stringify({
            ...finalOptions,
            // Don't log the full body if it's large
            body: finalOptions.body ? '[BODY]' : undefined,
        }, null, 2));

        try {
            const credentials = await this.getCredentials('customerOAuth2Api') as {
                clientId: string;
                clientSecret: string;
            };

            if (credentials === undefined) {
                throw new NodeOperationError(this.getNode(), 'No credentials found');
            }

            // First, get the OAuth2 token from the local server
            const tokenResponse = await this.helpers.httpRequest({
                method: 'POST',
                url: 'http://localhost:3000/oauth/token',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                },
                body: new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: credentials.clientId,
                    client_secret: credentials.clientSecret,
                    scope: 'read write',
                }).toString(),
                json: true,
            });

            if (!tokenResponse.access_token) {
                throw new Error('Failed to get access token');
            }

            console.log('=== OAUTH2 TOKEN ===');
            console.log(JSON.stringify({
                accessToken: tokenResponse.access_token ? '***' : 'MISSING',
                expiresIn: tokenResponse.expires_in,
                tokenType: tokenResponse.token_type,
                scope: tokenResponse.scope,
            }, null, 2));

            // Step 2: Local authentication was successful. Now, make a clean request to the public API.
            // IMPORTANT: We do not send the token to the public API.
            console.log('=== PUBLIC API REQUEST ===');
            const publicApiOptions = {
                ...finalOptions, // Contains method, url, qs, body, etc.
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    // NO 'Authorization' header is sent.
                },
            };

            const response = await this.helpers.httpRequest(publicApiOptions);

            console.log('=== API RESPONSE ===');
            console.log('Status:', response.statusCode || 200);
            console.log('Response data:', JSON.stringify(response, null, 2));

            return response;
        } catch (error) {
            console.error('=== OAUTH2 ERROR ===');
            console.error(error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                status: error.status,
                response: error.response ? {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    headers: error.response.headers,
                    data: error.response.data,
                } : 'No response',
            });
            throw error;
        }
        
    } catch (error) {
        console.error('API Request Error:', {
            message: error.message,
            method,
            endpoint,
            body,
            qs,
            uri,
            stack: error.stack
        });

        if (error.response) {
            const { status, statusText, data } = error.response;
            console.error('Error details:', { status, statusText, data });
            
            let errorMessage = `${status} - ${statusText}`;
            if (data) {
                if (typeof data === 'string') {
                    errorMessage += `: ${data}`;
                } else if (data.error) {
                    errorMessage += `: ${typeof data.error === 'string' ? data.error : JSON.stringify(data.error)}`;
                } else if (data.message) {
                    errorMessage += `: ${data.message}`;
                } else {
                    errorMessage += `: ${JSON.stringify(data)}`;
                }
            }
            
            throw new NodeApiError(this.getNode(), error, { 
                message: errorMessage,
                httpCode: status.toString()
            });
        }

        const errorMessage = error.message || 'Unknown error occurred';
        throw new Error(`API request failed: ${errorMessage}`);
    }
}

export async function apiRequestAllItems(
    this: IHookFunctions | IExecuteFunctions,
    method: IHttpRequestMethods,
    endpoint: string,
    body: any = {},
    qs: IDataObject = {},
    uri?: string
): Promise<IDataObject[]> {
    const returnData: IDataObject[] = [];
    let responseData;
    let page = 1;
    const queryParams = { ...qs, page };
    let hasMore = true;

    while (hasMore) {
        responseData = await apiRequest.call(this, method, endpoint, body, { ...queryParams }, uri);
        
        if (Array.isArray(responseData)) {
            if (responseData.length === 0) {
                hasMore = false;
            } else {
                returnData.push(...responseData);
                queryParams.page = ++page;
            }
        } else if (responseData && typeof responseData === 'object') {
            if (responseData.data && Array.isArray(responseData.data)) {
                if (responseData.data.length === 0) {
                    hasMore = false;
                } else {
                    returnData.push(...responseData.data);
                    queryParams.page = ++page;
                }
            } else {
                returnData.push(responseData);
                hasMore = false; // If we get a single object, assume it's the last page
            }
        } else {
            hasMore = false; // If response is not an array or object, stop
        }
    }

    return returnData;
}