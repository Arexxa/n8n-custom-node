// src/oauth2/model.ts
import express from 'express';
export interface Client {
    id: string;
    grants: string[];
    redirectUris: string[];
    clientSecret?: string;
    [key: string]: any;
}

export interface User {
    id: number | string;
    [key: string]: any;
}

export interface Token {
    accessToken: string;
    accessTokenExpiresAt: Date;
    refreshToken?: string;
    refreshTokenExpiresAt?: Date;
    client: Client;
    user: User;
    scope?: string;
    createdAt?: Date;
    [key: string]: any;
}

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';

// In-memory storage
const clientSecret = process.env.OAUTH2_CLIENT_SECRET;
if (!clientSecret) {
    throw new Error('FATAL: OAUTH2_CLIENT_SECRET must be set in your .env file. Please add it and restart the server.');
}

const clients = [
    {
        id: process.env.OAUTH2_CLIENT_ID || 'shoplink-client',
        clientSecret: clientSecret,
        grants: process.env.OAUTH2_GRANTS 
            ? process.env.OAUTH2_GRANTS.split(',').map(g => g.trim())
            : ['client_credentials', 'refresh_token', 'authorization_code'],
        redirectUris: (process.env.OAUTH2_REDIRECT_URIS || 'http://localhost:5678/rest/oauth2-credential/callback').split(','),
        accessTokenLifetime: parseInt(process.env.ACCESS_TOKEN_LIFETIME || '3600', 10),
        refreshTokenLifetime: parseInt(process.env.REFRESH_TOKEN_LIFETIME || '1209600', 10),
    },
];

// File-based token storage
const TOKENS_FILE = path.join(__dirname, 'tokens.json');

// Custom token serializer and deserializer
const serializeTokens = (tokens: Token[]) => {
    return tokens.map(token => ({
        ...token,
        accessTokenExpiresAt: token.accessTokenExpiresAt.toISOString(),
        refreshTokenExpiresAt: token.refreshTokenExpiresAt?.toISOString(),
        createdAt: token.createdAt?.toISOString()
    }));
};

const deserializeTokens = (data: any[]): Token[] => {
    return data.map(token => ({
        ...token,
        accessTokenExpiresAt: new Date(token.accessTokenExpiresAt),
        refreshTokenExpiresAt: token.refreshTokenExpiresAt ? new Date(token.refreshTokenExpiresAt) : undefined,
        createdAt: token.createdAt ? new Date(token.createdAt) : undefined
    }));
};

// Load tokens from file or initialize empty array
let tokens: Token[] = [];
try {
    if (fs.existsSync(TOKENS_FILE)) {
        const data = fs.readFileSync(TOKENS_FILE, 'utf8');
        const parsedData = JSON.parse(data);
        tokens = deserializeTokens(parsedData);
        console.log(`Loaded ${tokens.length} tokens from file`);
        
        // Debug: log all existing tokens
        tokens.forEach((token, index) => {
            console.log(`Token ${index + 1}:`, {
                accessToken: token.accessToken.substring(0, 20) + '...',
                expiresAt: token.accessTokenExpiresAt,
                clientId: token.client?.id,
                userId: token.user?.id
            });
        });
    }
} catch (error) {
    console.error('Error loading tokens:', error);
}

// Function to save tokens to file
const saveTokens = () => {
    try {
        const serializedTokens = serializeTokens(tokens);
        fs.writeFileSync(TOKENS_FILE, JSON.stringify(serializedTokens, null, 2));
        console.log('Tokens saved to file');
    } catch (error) {
        console.error('Error saving tokens:', error);
    }
};

// In-memory storage for authorization codes
interface AuthorizationCode {
    authorizationCode: string;
    expiresAt: Date;
    redirectUri: string;
    scope?: string | string[];
    client: Client;
    user: User;
}

const authCodes: AuthorizationCode[] = [];

export const model = {
    getClient: async (clientId: string, clientSecret?: string): Promise<Client | null> => {
        console.log('\n--- GET CLIENT ---');
        console.log('Requested Client ID:', clientId);
        console.log('Client Secret provided:', !!clientSecret);
        
        // Log all available clients for debugging
        console.log('Available clients:', clients.map(c => {
            const maskedSecret = c.clientSecret ? 
                `${c.clientSecret.substring(0, 4)}...${c.clientSecret.substring(c.clientSecret.length - 4)}` : 
                'none';
            const secretMatches = c.clientSecret === clientSecret;
            
            return {
                id: c.id,
                hasSecret: !!c.clientSecret,
                secretLength: c.clientSecret?.length || 0,
                secretMatches,
                maskedSecret
            };
        }));
        
        // Log the received secret (masked)
        if (clientSecret) {
            const maskedReceived = `${clientSecret.substring(0, 4)}...${clientSecret.substring(clientSecret.length - 4)}`;
            console.log('Received secret (masked):', maskedReceived);
            console.log('Received secret length:', clientSecret.length);
        }
        
        const client = clients.find(
            (client) => client.id === clientId && (!clientSecret || client.clientSecret === clientSecret)
        );
        
        console.log('Client found:', !!client);
        if (!client) {
            console.log('Client not found or secret mismatch');
            console.log('Expected client ID:', clientId);
            console.log('Expected client secret length:', clientSecret?.length || 0);
        } else {
            console.log('Client details:', {
                id: client.id,
                hasSecret: !!client.clientSecret,
                secretLength: client.clientSecret?.length || 0
            });
        }
        console.log('------------------\n');
        
        return client || null;
    },

    // Add getUserFromClient for client_credentials grant
    getUserFromClient: async (client: Client): Promise<User> => {
        console.log('\n--- GET USER FROM CLIENT ---');
        console.log('Client ID:', client.id);
        
        // Return a default user for client credentials flow
        const user = { id: 'client_user', name: 'Client User' };
        console.log('Returning user:', user);
        console.log('---------------------------\n');
        
        return user;
    },

    saveAuthorizationCode: async (code: AuthorizationCode, client: Client, user: User): Promise<AuthorizationCode> => {
        const authCode = {
            authorizationCode: code.authorizationCode,
            expiresAt: code.expiresAt,
            redirectUri: code.redirectUri,
            scope: code.scope,
            client: client,
            user: user,
        };
        authCodes.push(authCode);
        return authCode;
    },

    getAuthorizationCode: async (authorizationCode: string): Promise<AuthorizationCode | null> => {
        const authCode = authCodes.find((code) => code.authorizationCode === authorizationCode);
        return authCode || null;
    },

    revokeAuthorizationCode: async (code: AuthorizationCode): Promise<boolean> => {
        const index = authCodes.findIndex((authCode) => authCode.authorizationCode === code.authorizationCode);
        if (index !== -1) {
            authCodes.splice(index, 1);
        }
        return true;
    },

    saveToken: async (token: Token, client: Client, user: User): Promise<Token> => {
        console.log('\n--- SAVING TOKEN ---');
        console.log('Token to save:', {
            accessToken: token.accessToken.substring(0, 20) + '...',
            expiresAt: token.accessTokenExpiresAt,
            clientId: client.id,
            userId: user.id
        });
        
        // Set refresh token expiration if not provided (default: 30 days from now)
        const refreshTokenExpiresAt = token.refreshTokenExpiresAt || new Date(Date.now() + (30 * 24 * 60 * 60 * 1000));
        
        const fullToken: Token = {
            ...token,
            client: client,
            user: user,
            refreshTokenExpiresAt: refreshTokenExpiresAt,
            createdAt: new Date(),
            scope: token.scope || 'customer:read customer:write'
        };
        
        console.log('Full token created with expiration:', fullToken.accessTokenExpiresAt);
        
        // Remove any existing tokens for this client and user
        const beforeCount = tokens.length;
        tokens = tokens.filter(t => 
            !(t.client.id === client.id && String(t.user.id) === String(user.id))
        );
        console.log(`Removed ${beforeCount - tokens.length} existing tokens`);
        
        // Add the new token
        tokens.push(fullToken);
        console.log(`Total tokens in storage: ${tokens.length}`);
        
        // Save tokens to file
        saveTokens();
        
        console.log('--------------------\n');
        return fullToken;
    },

    getRefreshToken: async (refreshToken: string): Promise<Token | null> => {
        console.log('\n--- GETTING REFRESH TOKEN ---');
        console.log('Requested Refresh Token:', refreshToken?.substring(0, 20) + '...');
        
        const foundToken = tokens.find((token) => token.refreshToken === refreshToken);
        
        if (foundToken) {
            console.log('Found token, expires at:', foundToken.refreshTokenExpiresAt);
            console.log('Current time:', new Date());
            
            // Check if refresh token has expired
            if (foundToken.refreshTokenExpiresAt && new Date() > new Date(foundToken.refreshTokenExpiresAt)) {
                console.log('Refresh token has expired');
                // Remove the expired token
                tokens = tokens.filter(t => t.refreshToken !== refreshToken);
                saveTokens();
                return null;
            }
            
            console.log('Refresh token is valid');
        } else {
            console.log('Refresh token not found in storage');
            console.log('Available refresh tokens:', tokens.map(t => t.refreshToken?.substring(0, 10) + '...'));
        }
        
        console.log('---------------------------\n');
        return foundToken || null;
    },

    revokeToken: async (token: Token): Promise<boolean> => {
        const beforeCount = tokens.length;
        tokens = tokens.filter((t) => t.refreshToken !== token.refreshToken);
        const afterCount = tokens.length;
        
        if (beforeCount !== afterCount) {
            saveTokens();
            console.log('Token revoked successfully');
        }
        return true;
    },

    getAccessToken: async (accessToken: string): Promise<Token | null> => {
        console.log('\n--- GETTING ACCESS TOKEN ---');
        console.log('Requested Token (first 20 chars):', accessToken?.substring(0, 20) + '...');
        console.log('Total tokens in storage:', tokens.length);
        
        // Enhanced token logging
        tokens.forEach((token, index) => {
            console.log(`Token ${index + 1}:`, {
                token: token.accessToken.substring(0, 20) + '...',
                expiresAt: token.accessTokenExpiresAt,
                clientId: token.clientId,
                userId: token.userId,
                isExpired: token.accessTokenExpiresAt && new Date() > new Date(token.accessTokenExpiresAt)
            });
        });
        
        // Find the token in storage
        const token = tokens.find(t => t.accessToken === accessToken);
        
        if (!token) {
            console.log('❌ Token not found in storage');
            console.log('--------------------------\n');
            return null;
        }
        
        const now = new Date();
        const expiresAt = token.accessTokenExpiresAt ? new Date(token.accessTokenExpiresAt) : null;
        
        console.log('✅ Token found:', {
            clientId: token.clientId,
            userId: token.userId,
            expiresAt: expiresAt,
            isExpired: expiresAt ? now > expiresAt : true
        });
        
        if (expiresAt && now > expiresAt) {
            console.log('❌ Token expired at:', expiresAt);
            console.log('Current time:', now);
            console.log('--------------------------\n');
            return null;
        }
        
        console.log('✅ Token is valid');
        console.log('--------------------------\n');
        
        if (!expiresAt) {
            throw new Error('Token must have an expiration date');
        }
        
        return {
            accessToken: token.accessToken,
            accessTokenExpiresAt: expiresAt,
            client: { 
                id: token.clientId,
                grants: ['client_credentials'],
                redirectUris: []
            },
            user: { 
                id: token.userId || 'anonymous',
                username: token.userId?.toString() || 'anonymous'
            }
        };
    },

    validateToken: async function(req: express.Request, accessToken: string) {
        console.log('\n--- VALIDATING TOKEN ---');
        console.log('Endpoint:', req.path);
        console.log('Method:', req.method);
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        
        const token = await this.getAccessToken(accessToken);
        if (!token) {
            console.log('❌ Token validation failed');
            return false;
        }
        
        console.log('✅ Token validated successfully');
        return token;
    },

    verifyScope: async (token: Token, scope: string): Promise<boolean> => {
        console.log('\n--- VERIFY SCOPE ---');
        console.log('Token scope:', token.scope);
        console.log('Required scope:', scope);
        
        if (!token.scope) {
            console.log('No scope in token, allowing access');
            return true; // Allow access if no scope is defined
        }
        
        const requestedScopes = scope.split(' ');
        const tokenScopes = token.scope.split(' ');
        const hasAccess = requestedScopes.every(s => tokenScopes.includes(s));
        
        console.log('Has required scope:', hasAccess);
        console.log('-------------------\n');
        
        return hasAccess;
    },
};