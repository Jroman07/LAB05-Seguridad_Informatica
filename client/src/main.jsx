import React from 'react';
import {createRoot} from 'react-dom/client';
import {Auth0Provider} from '@auth0/auth0-react';
import {authConfig} from './auth-config';
import App from './App';
import './style.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Auth0Provider
      domain={authConfig.domain}
      clientId={authConfig.clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: authConfig.audience,
        scope: 'openid profile email'
      }}
    >
      <App />
    </Auth0Provider>
  </React.StrictMode>
);
