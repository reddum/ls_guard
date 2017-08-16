const { createKeyStore } = require('oidc-provider');
const fs = require('fs');
const keystore = createKeyStore();
keystore.generate('RSA', 2048, {
  alg: 'RS256',
  use: 'sig',
}).then(function () {
  console.log('this is the full private JWKS:\n', keystore.toJSON());
  console.log('kid:\n', keystore.all());
  fs.writeFile('key', JSON.stringify(keystore.toJSON(true)), (err) => {
    if (err) throw err;
    console.log('The file has been saved!');
    });
});