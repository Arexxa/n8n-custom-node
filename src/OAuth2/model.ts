import { Request, Response } from 'express';
import { Token, Client, User } from 'oauth2-server';

export const oauthModel = {
  getClient: async (clientId: string, clientSecret: string): Promise<Client | null> => {
    if (clientId === 'my-client' && clientSecret === 'secret') {
      return {
        id: clientId,
        grants: ['password', 'refresh_token'],
        redirectUris: ['http://localhost:3000/callback']
      };
    }
    return null;
  },

  getUser: async (username: string, password: string): Promise<User | null> => {
    if (username === 'admin' && password === 'password') {
      return { id: 1 };
    }
    return null;
  },

  saveToken: async (token: Token, client: Client, user: User): Promise<Token> => {
    token.client = client;
    token.user = user;
    return token;
  },

  getAccessToken: async (accessToken: string): Promise<Token | null> => {
    // You would usually look this up in a DB
    return {
      accessToken,
      accessTokenExpiresAt: new Date(Date.now() + 3600000),
      client: {
          id: 'my-client',
          grants: ''
      },
      user: { id: 1 }
    };
  },

  verifyScope: async (token: Token, scope: string | string[]): Promise<boolean> => {
    return true;
  }
};
