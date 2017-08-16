const express = require('express');
const Provider = require('oidc-provider');

const app = express();

const configuration = {
    async findById(ctx, id) {
        return {
            accountId: id,
            async claims() { return { sub: id }; },
        };
    }
};

const clients = [
    {
      client_id: 'foo',
      redirect_uris: ['https://example.com'],
      response_types: ['code id_token token'],
      grant_types: ['authorization_code', 'implicit'],
      token_endpoint_auth_method: 'none',
    },
];

const fs = require('fs');
const Q = require('q');

function readKey() {
    return new Promise((resolve, reject) => {
        fs.readFile('key', (err, data) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(data);
        })
    });
}

async function main() {
    const key = await readKey();

    console.log(key.toString());
    console.log('here');
    const oidc = new Provider('http://localhost:3000', configuration);
    oidc.initialize({ clients }).then(function () {
        app.use('/', oidc.callback);
        app.listen(3000);
    });
}

main();

