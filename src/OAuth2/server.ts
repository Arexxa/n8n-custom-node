import express, { Request, Response } from 'express';
import OAuth2Server from 'oauth2-server';
import { oauthModel } from './model';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const oAuth = new OAuth2Server({
  model: oauthModel,
  accessTokenLifetime: 60 * 60,
  allowBearerTokensInQueryString: true
});

app.post('/oauth/token', (req: Request, res: Response) => {
  const request = new OAuth2Server.Request(req);
  const response = new OAuth2Server.Response(res);

  oAuth.token(request, response)
    .then((token) => res.json(token))
    .catch((err) => res.status(err.code || 500).json(err));
});

app.get('/secure', (req: Request, res: Response, next) => {
  const request = new OAuth2Server.Request(req);
  const response = new OAuth2Server.Response(res);

  oAuth.authenticate(request, response)
    .then(() => res.send('This is a secure resource.'))
    .catch((err) => res.status(err.code || 500).json(err));
});

app.listen(3000, () => {
  console.log('OAuth2 server running on http://localhost:3000');
});
