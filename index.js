const express = require('express');
const Provider = require('oidc-provider');

const app = express();

const oidc = new Provider('http://localhost:3000');

const configuration = {
  // ... see available options /docs/configuration.md
};
const clients = [{
  client_id: 'newhire',
  client_secret: 'newh1re',
  redirect_uris: ['http://lvh.me:8080/cb'],
  // + other client properties
}];

oidc.initialize({ clients }).then(function () {
    app.use('/', oidc.callback);
    app.listen(3000);
});
