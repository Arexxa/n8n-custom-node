// src/oauth2/server.ts
import express from 'express';
import OAuth2Server from 'oauth2-server';
import { model } from './model';
import * as dotenv from 'dotenv';
import axios, { AxiosRequestConfig, Method } from 'axios';
import cors from 'cors';

// Initialize dotenv
dotenv.config();

// Extend Express Request type to include token
declare global {
    namespace Express {
        interface Request {
            token?: any;
            oauth?: {
                token: any;
            };
        }
    }
}

// Validate required environment variables
const requiredEnvVars = [
    'OAUTH2_CLIENT_ID',
    'OAUTH2_CLIENT_SECRET',
    'ACCESS_TOKEN_LIFETIME',
    'REFRESH_TOKEN_LIFETIME'
];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`Missing required environment variable: ${envVar}`);
        process.exit(1);
    }
}

const PORT = process.env.PORT || 3000;

// Create Express app with OAuth2 server
type App = express.Express & { oauth: OAuth2Server };
const app = express() as App;

// Enable CORS
app.use(cors({
    origin: true, // Reflect the request origin
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import required modules
import * as https from 'https';
import * as http from 'http';

// API Proxy Middleware
const apiProxyHandler = async (req: express.Request, res: express.Response): Promise<void> => {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !(typeof authHeader === 'string') || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ 
            status: 'fail',
            message: 'No token provided',
            data: null
        });
        return;
    }

    // Validate the token
    const token = authHeader.split(' ')[1];
    const request = new OAuth2Server.Request({
        headers: { authorization: `Bearer ${token}` },
        method: req.method,
        query: { ...req.query },
        body: { ...req.body }
    });
    
    const response = new OAuth2Server.Response();
    
    try {
        // This will throw if token is invalid
        await app.oauth.authenticate(request, response);
        
        // If we get here, token is valid - forward the request to the actual API
        // The request comes to /api/... but we need to forward to the external API
        // The path after /api needs to be sent to the external API
        const apiPath = req.originalUrl.startsWith('/api') ? req.originalUrl.substring(4) : req.originalUrl;
        const externalApiBase = 'https://loyaltycrmapidev.shoplink.hk';
        const apiUrl = `${externalApiBase}${apiPath}`;
        
        console.log('=== REQUEST DETAILS ===');
        console.log('Original URL:', req.originalUrl);
        console.log('API Path:', apiPath);
        console.log('Full External URL:', apiUrl);
        console.log('Method:', req.method);
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        
        // Create the request to the actual API
        const options: https.RequestOptions = {
            method: req.method,
            headers: {
                ...req.headers as Record<string, string | string[] | undefined>,
                // Remove the host header to avoid issues with the external API
                host: 'loyaltycrmapidev.shoplink.hk',
                // Explicitly set the content-type if not present
                'content-type': 'application/json',
                'accept': 'application/json'
            },
            // Disable SSL verification (for development only)
            rejectUnauthorized: false
        };
        
        // Remove the authorization header before forwarding to the actual API
        // since it doesn't expect OAuth2 tokens
        delete (options.headers as any)['authorization'];
        delete (options.headers as any)['host'];
        delete (options.headers as any)['content-length'];
        
        // Remove the authorization header before forwarding to the actual API
        // since it doesn't expect OAuth2 tokens
        if (options.headers && !Array.isArray(options.headers)) {
            delete (options.headers as Record<string, unknown>)['authorization'];
        }
        
        const apiReq = https.request(apiUrl, options, (apiRes: http.IncomingMessage) => {
            res.status(apiRes.statusCode || 500);
            
            // Forward headers
            if (apiRes.headers) {
                Object.entries(apiRes.headers).forEach(([key, value]) => {
                    if (value) {
                        res.setHeader(key, value);
                    }
                });
            }
            
            // Stream the response
            apiRes.pipe(res);
        });
        
        // Handle errors
        apiReq.on('error', (error: Error) => {
            console.error('API request error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Error forwarding request to API',
                data: null
            });
        });
        
        // If there's a body, forward it
        if (req.body && Object.keys(req.body).length > 0) {
            apiReq.write(JSON.stringify(req.body));
        }
        
        apiReq.end();
        
    } catch (error) {
        console.error('Token validation failed:', error);
        res.status(401).json({
            status: 'fail',
            message: 'Invalid token',
            data: null
        });
    }
};

// Apply the middleware
app.use('/api', (req, res, next) => {
    apiProxyHandler(req, res).catch(error => {
        console.error('Error in API proxy:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            data: null
        });
    });
});

// Create OAuth2 server
const oauth = new OAuth2Server({
    model: model,
    allowBearerTokensInQueryString: true,
    accessTokenLifetime: parseInt(process.env.ACCESS_TOKEN_LIFETIME || '86400', 10), // 24 hours
    refreshTokenLifetime: parseInt(process.env.REFRESH_TOKEN_LIFETIME || '604800', 10), // 7 days
});

// Attach OAuth server to app
app.oauth = oauth;

// Add CORS middleware first
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});

// Add a middleware to log all incoming requests
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log(`[Request Log] ${req.method} ${req.originalUrl}`);
    next();
});

// Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Authorization endpoint - displays a consent form
app.get('/oauth/authorize', (req: express.Request, res: express.Response) => {
    const { client_id, redirect_uri, response_type, state, scope } = req.query;
    res.send(`
        <h1>Authorize Access</h1>
        <p>The application <strong>${client_id}</strong> wants to access your data.</p>
        <form action="/oauth/authorize" method="post">
            <input type="hidden" name="client_id" value="${client_id}" />
            <input type="hidden" name="redirect_uri" value="${redirect_uri}" />
            <input type="hidden" name="response_type" value="${response_type}" />
            <input type="hidden" name="state" value="${state}" />
            <input type="hidden" name="scope" value="${scope}" />
            <div>
                <label for="username">Username:</label>
                <input type="text" id="username" name="username" value="testuser" required>
            </div>
            <br>
            <button type="submit" name="allow" value="true">Allow</button>
            <button type="submit" name="deny" value="true">Deny</button>
        </form>
    `);
});

// Authorization endpoint - handles the form submission
app.post('/oauth/authorize', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.body.deny) {
        // If the user denied access, redirect with an error
        const redirectUri = new URL(req.body.redirect_uri);
        redirectUri.searchParams.set('error', 'access_denied');
        if (req.body.state) {
            redirectUri.searchParams.set('state', req.body.state);
        }
        return res.redirect(redirectUri.toString());
    }

    const request = new OAuth2Server.Request(req);
    const response = new OAuth2Server.Response(res);

    // This is a dummy authentication handler. In a real app, you'd verify
    // the user's credentials (e.g., from req.body.username).
    const options = {
        authenticateHandler: {
            handle: () => ({ id: 1, name: 'Test User' }), // Mock user object
        },
    };

    try {
        await app.oauth.authorize(request, response, options);
        // The `authorize` method handles the redirect for you if successful.
        res.set(response.headers);
        res.status(response.status || 302).send(response.body);
    } catch (err) {
        next(err); // Pass errors to the error handler
    }
});

// Token endpoint
app.post('/oauth/token', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Set client credentials from Basic Auth header if not in body
    if (!req.body.client_id && req.headers.authorization) {
        const auth = req.headers.authorization.split(' ');
        if (auth[0] === 'Basic') {
            const [clientId, clientSecret] = Buffer.from(auth[1], 'base64').toString().split(':');
            req.body.client_id = clientId;
            req.body.client_secret = clientSecret;
        }
    }
    
    const request = new OAuth2Server.Request(req);
    const response = new OAuth2Server.Response(res);
    
    app.oauth.token(request, response)
        .then((token) => {
            res.set(response.headers);
            res.json(response.body);
        })
        .catch(next);
});

// Token validation endpoint
const validateToken = async (req: express.Request, res: express.Response): Promise<void> => {
    console.log('\n--- TOKEN VALIDATION REQUEST ---');
    console.log('Method:', req.method);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Query:', req.query);
    console.log('Body:', req.body);
    
    try {
        
        const authHeader = req.headers.authorization;
        if (!authHeader || !(typeof authHeader === 'string') || !authHeader.startsWith('Bearer ')) {
            console.log('❌ No Bearer token provided');
            res.status(401).json({ 
                active: false,
                error: 'No Bearer token provided' 
            });
            return;
        }

        const token = authHeader.split(' ')[1];
        console.log('Validating token:', token.substring(0, 10) + '...');
        
        const request = new OAuth2Server.Request({
            headers: { 
                ...req.headers,
                authorization: `Bearer ${token}` 
            },
            method: req.method,
            query: { ...req.query },
            body: { ...req.body }
        });
        
        const response = new OAuth2Server.Response();

        console.log('Authenticating token...');
        const tokenInfo = await app.oauth.authenticate(request, response);
        
        if (!tokenInfo.accessTokenExpiresAt) {
            console.log('❌ Token has no expiration date');
            res.status(500).json({ 
                active: false,
                error: 'Token expiration not set' 
            });
            return;
        }
        
        const now = new Date();
        const expiresAt = new Date(tokenInfo.accessTokenExpiresAt);
        
        if (now > expiresAt) {
            console.log(`❌ Token expired at: ${expiresAt}`);
            res.status(401).json({ 
                active: false,
                error: 'Token expired',
                expires_at: expiresAt.toISOString()
            });
            return;
        }
        
        console.log('✅ Token is valid');
        console.log('Client ID:', tokenInfo.client.id);
        console.log('User ID:', tokenInfo.user.id);
        console.log('Expires at:', expiresAt);
        console.log('Scopes:', tokenInfo.scope || 'none');
        
        // Return token info in n8n's expected format
        const tokenResponse = {
            active: true,
            client_id: tokenInfo.client.id,
            user_id: tokenInfo.user.id,
            exp: Math.floor(expiresAt.getTime() / 1000),
            iat: tokenInfo.createdAt ? Math.floor(tokenInfo.createdAt.getTime() / 1000) : Math.floor(Date.now() / 1000) - 60, // Default to now - 60s if not set
            scope: tokenInfo.scope || '',
            // Include any additional fields that n8n might expect
            token_type: 'Bearer',
            expires_in: Math.floor((expiresAt.getTime() - Date.now()) / 1000)
        };
        
        console.log('✅ Token validation successful:', tokenResponse);
        res.json(tokenResponse);
    } catch (error) {
        console.error('❌ Token validation failed:', error);
        res.status(401).json({ 
            active: false,
            error: 'Invalid token',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Token validation endpoint (used by n8n)
app.all('/oauth/validate', (req: express.Request, res: express.Response) => {
    console.log('\n--- VALIDATION ENDPOINT HIT ---');
    console.log('Method:', req.method);
    console.log('Headers:', req.headers);
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.status(200).end();
        return;
    }
    
    validateToken(req, res).catch(err => {
        console.error('❌ Error in token validation:', err);
        res.status(500).json({ 
            active: false,
            error: 'Internal server error',
            details: err instanceof Error ? err.message : 'Unknown error'
        });
    });
});


// External API base URL
const EXTERNAL_API_BASE = 'https://loyaltycrmapidev.shoplink.hk/api/crm';

// Proxy middleware to forward requests to external API
const proxyToExternalApi = async (req: express.Request, res: express.Response) => {
    try {
        console.log('\n--- PROXY REQUEST ---');
        console.log('Original URL:', req.originalUrl);
        console.log('Method:', req.method);
        
        // Extract the path after /api/crm and preserve it
        const pathMatch = req.originalUrl.match(/\/api\/crm(\/.*)?$/);
        const path = pathMatch ? pathMatch[1] || '' : '';
        
        // Create the target URL - keep the /api/crm prefix
        const targetUrl = new URL(`/api/crm${path}`, EXTERNAL_API_BASE);
        
        // Copy all query parameters
        Object.entries(req.query).forEach(([key, value]) => {
            if (value !== undefined) {
                const values = Array.isArray(value) ? value : [value];
                values.forEach(v => {
                    if (v !== undefined) {
                        targetUrl.searchParams.append(key, v.toString());
                    }
                });
            }
        });
        
        // Prepare headers (exclude problematic headers)
        const headers: Record<string, string> = {};
        const excludedHeaders = [
            'host', 
            'content-length', 
            'transfer-encoding', 
            'connection', 
            'keep-alive',
            'proxy-authenticate',
            'proxy-authorization',
            'te',
            'trailers',
            'upgrade'
        ];
        
        Object.entries(req.headers).forEach(([key, value]) => {
            if (value !== undefined && !excludedHeaders.includes(key.toLowerCase())) {
                headers[key] = Array.isArray(value) ? value.join(', ') : value;
            }
        });
        
        console.log('Proxying to:', targetUrl.toString());
        console.log('Request headers:', JSON.stringify(headers, null, 2));
        console.log('Request body:', req.body);
        
        const axiosConfig: AxiosRequestConfig = {
            method: req.method as Method,
            url: targetUrl.toString(),
            headers: {
                ...headers,
                'User-Agent': 'OAuth2-Proxy/1.0',
                'x-forwarded-for': req.ip,
                'x-original-host': req.headers.host || ''
            },
            // Only include data for methods that typically have a body
            ...(req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS' && req.body ? { data: req.body } : {}),
            timeout: 30000, // 30 seconds timeout
            maxRedirects: 5,
            validateStatus: () => true, // Accept all status codes
        };
        
        // Remove data field for GET requests to avoid issues
        if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
            delete axiosConfig.data;
        }
        
        // Log the config with sensitive data redacted
        const logConfig = { ...axiosConfig };
        if (logConfig.headers?.authorization) {
            logConfig.headers.authorization = '***REDACTED***';
        }
        console.log('Axios config:', JSON.stringify(logConfig, null, 2));
        
        const response = await axios(axiosConfig);
        
        console.log('Response status:', response.status);
        console.log('Response headers:', JSON.stringify(response.headers, null, 2));
        
        // Set response status
        res.status(response.status);
        
        // Copy safe response headers
        const safeResponseHeaders = [
            'content-type',
            'content-disposition',
            'content-encoding',
            'cache-control',
            'expires',
            'last-modified',
            'etag',
            'vary',
            'access-control-allow-origin',
            'access-control-allow-methods',
            'access-control-allow-headers',
            'access-control-expose-headers',
            'access-control-max-age',
            'access-control-allow-credentials'
        ];
        
        Object.entries(response.headers).forEach(([key, value]) => {
            if (value !== undefined && safeResponseHeaders.includes(key.toLowerCase())) {
                res.setHeader(key, value);
            }
        });
        
        // Send the response data
        if (response.data) {
            // Handle different response types
            if (typeof response.data === 'string') {
                res.send(response.data);
            } else if (Buffer.isBuffer(response.data)) {
                res.send(response.data);
            } else {
                res.json(response.data);
            }
        } else {
            res.end();
        }
        
    } catch (error: any) {
        console.error('Proxy error:', error.message);
        
        if (axios.isAxiosError(error)) {
            if (error.response) {
                // The request was made and the server responded with a status code
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
                
                res.status(error.response.status);
                
                // Copy safe error response headers
                const safeHeaders = ['content-type'];
                if (error.response.headers) {
                    Object.entries(error.response.headers).forEach(([key, value]) => {
                        if (value !== undefined && safeHeaders.includes(key.toLowerCase())) {
                            res.setHeader(key, value);
                        }
                    });
                }
                
                // Send error response
                if (error.response.data) {
                    if (typeof error.response.data === 'string') {
                        res.send(error.response.data);
                    } else {
                        res.json(error.response.data);
                    }
                } else {
                    res.json({
                        status: 'error',
                        message: 'Error from external API',
                        data: null
                    });
                }
            } else if (error.request) {
                // The request was made but no response was received
                console.error('No response received');
                res.status(502).json({
                    status: 'error',
                    message: 'No response from the external API',
                    data: null
                });
            } else {
                // Something happened in setting up the request
                console.error('Request setup error:', error.message);
                res.status(500).json({
                    status: 'error',
                    message: 'Error setting up the request',
                    data: error.message
                });
            }
        } else {
            // Non-Axios error
            console.error('Non-Axios error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Internal proxy error',
                data: error.message
            });
        }
    }
};

// OAuth2 authentication middleware
const authenticateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log('Auth headers:', req.headers.authorization);
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !(typeof authHeader === 'string') || !authHeader.startsWith('Bearer ')) {
        console.log('No Bearer token found in headers');
        res.status(401).json({ 
            status: 'fail',
            message: 'No token provided',
            data: null 
        });
        return;
    }

    const token = authHeader.split(' ')[1];
    console.log('Token to validate:', token);

    const request = new OAuth2Server.Request({
        headers: { 
            ...req.headers,
            'authorization': `Bearer ${token}`
        },
        method: req.method,
        query: req.query,
        body: req.body,
    });
    
    const response = new OAuth2Server.Response();
    console.log('Authenticating token...');

    app.oauth.authenticate(request, response)
        .then((tokenInfo: any) => {
            console.log('Token validated successfully:', tokenInfo);
            // Attach token info to the request for use in route handlers
            req.token = tokenInfo;
            next();
        })
        .catch((err: Error) => {
            console.error('Authentication error:', err);
            res.status(401).json({ 
                status: 'fail',
                message: 'Invalid or expired token',
                data: null 
            });
        });
};

// Test endpoint to verify server is working
app.get('/api/health', (req, res) => {
    console.log('Health check endpoint called');
    res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// API Endpoints
// These endpoints will be protected by OAuth2 and will proxy to the external API
// Log all incoming requests
app.use((req, res, next) => {
    console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    next();
});

// Specific endpoints
const handleApiRequest = async (req: express.Request, res: express.Response) => {
    console.log(`\n=== NEW REQUEST ===`);
    console.log(`Handling ${req.method} ${req.originalUrl}`);
    console.log('Auth header:', req.headers.authorization);
    
    // First authenticate the request
    return new Promise<void>((resolve) => {
        authenticateRequest(req, res, (err?: any) => {
            if (err) {
                console.error('Authentication failed:', err);
                if (!res.headersSent) {
                    res.status(401).json({ 
                        status: 'fail',
                        message: 'Authentication failed',
                        data: null 
                    });
                }
                return resolve();
            }
            
            // If authentication passed, proxy the request
            console.log('Authentication successful, proxying request...');
            proxyToExternalApi(req, res).finally(() => resolve());
        });
    });
};

// Apply the handler to specific routes first
app.all('/api/crm/appcustomers/demo', handleApiRequest);
app.all('/api/crm/appcustomer/demo/:id', handleApiRequest);

// Use a regex pattern instead of the wildcard that's causing the issue
app.use('/api/crm', (req: express.Request, res: express.Response) => {
    // Only handle requests that haven't been handled by more specific routes above
    return handleApiRequest(req, res);
});

// Error handling
app.use((
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
) => {
    console.error('OAuth2 Server Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'OAuth Server Error',
    });
});

export function startOAuth2Server(port = 3000) {
    return app.listen(port, () => {
        console.log(`OAuth2 server running on http://localhost:${port}`);
        console.log('Available endpoints:');
        console.log(`- POST http://localhost:${port}/oauth/token`);
        console.log(`- GET  http://localhost:${port}/secure`);
    });
}

// Start server if this file is run directly
if (require.main === module) {
    const server = startOAuth2Server(parseInt(PORT as string));
    server.on('listening', () => {
        console.log(`OAuth2 Server running on http://localhost:${PORT}`);
        console.log('Available endpoints:');
        console.log(`- GET  http://localhost:${PORT}/oauth/authorize`);
        console.log(`- POST http://localhost:${PORT}/oauth/token`);
        console.log(`- POST http://localhost:${PORT}/oauth/revoke`);
    });
    
    server.on('error', (error: Error) => {
        console.error('Failed to start OAuth2 server:', error);
        process.exit(1);
    });
}