// //http://localhost:3000/auth?client_id=newhire&redirect_uri=http://ct.com:5000/&response_type=code&scope=openid
// const Provider = require("oidc-provider");
// const Router = require('koa-router');
// const render = require('koa-ejs');
// const path = require('path');

// const Account = require('./account');
// const { clients }  = require('./clients');
// const port = process.env.PORT || 3000;
// const issuer = process.env.ISSUER || 'http://localhost:3000';

// const config = {
//   acrValues: ['session', 'urn:mace:incommon:iap:bronze'],
//   cookies: {
//     long: { signed: true, maxAge: (1 * 24 * 60 * 60) * 1000 }, // 1 day in ms
//     short: { signed: true },
//   },
//   findById: Account.findById,
//   interactionUrl: function interactionUrl(ctx, interaction) { // eslint-disable-line no-unused-vars
//     return `/interaction/${ctx.oidc.uuid}`;
//   },
//   ttl: {
//     AccessToken: 1 * 60 * 60, // 1 hour in seconds
//     AuthorizationCode: 10 * 60, // 10 minutes in seconds
//     ClientCredentials: 10 * 60, // 10 minutes in seconds
//     IdToken: 1 * 60 * 60, // 1 hour in seconds
//     RefreshToken: 1 * 24 * 60 * 60, // 1 day in seconds
//   },
// };
// const provider = new Provider(issuer, config);
// const fs = require("fs");

// function readKeyStore() {
//   return new Promise((resolve, reject) => {
//     fs.readFile("key", (err, data) => {
//       if (err) {
//         reject(err);
//         return;
//       }
//       resolve(JSON.parse(data.toString()));
//     });
//   });
// }

// async function main() {
//   const keystore = await readKeyStore(); 
//   provider.initialize({ 
//     clients, keystore
//   }).then(() => {
//     render(provider.app, {
//       cache: false,
//       layout: '_layout',
//       root: path.join(__dirname, 'views')
//     });
//     const router = new Router();
//     router.get('/interaction/:grant', async (ctx, next) => {
//       const details = await provider.interactionDetails(ctx.req);
//       const client = await provider.Client.find(details.params.client_id);
//       console.log(ctx);
//       console.log(detail);
//       if (details.interaction.error === 'login_required') {
//         await ctx.render('login', {
//           client,
//           details,
//           title: 'Sign-in',
//           debug: querystring.stringify(details.params, ',<br/>', ' = ', {
//             encodeURIComponent: value => value,
//           }),
//           interaction: querystring.stringify(details.interaction, ',<br/>', ' = ', {
//             encodeURIComponent: value => value,
//           }),
//         });
//       } else {
//         await ctx.render('interaction', {
//           client,
//           details,
//           title: 'Authorize',
//           debug: querystring.stringify(details.params, ',<br/>', ' = ', {
//             encodeURIComponent: value => value,
//           }),
//           interaction: querystring.stringify(details.interaction, ',<br/>', ' = ', {
//             encodeURIComponent: value => value,
//           }),
//         });
//       }
//       await next();
//     });
//     provider.app.use(router.routes());
//   }).then(() => {
//     provider.app.listen(port);
//   });
// };

// main();

/* eslint-disable no-console */

const Provider = require("oidc-provider");
const path = require('path');
const { set } = require('lodash');
const bodyParser = require('koa-body');
const querystring = require('querystring');
const Router = require('koa-router');
const render = require('koa-ejs');

const port = process.env.PORT || 3000;

const Account = require('./account');
const { config, clients, certificates } = require('./settings');

const issuer = process.env.ISSUER || 'http://localhost:3000';

config.findById = Account.findById;

const provider = new Provider(issuer, config);

provider.defaultHttpOptions = { timeout: 15000 };

provider.initialize({
  adapter: process.env.MONGODB_URI ? require('./adapters/mongodb') : undefined, // eslint-disable-line global-require
  clients,
  keystore: { keys: certificates },
}).then(() => {
  render(provider.app, {
    cache: false,
    layout: '_layout',
    root: path.join(__dirname, 'views'),
  });

  provider.app.keys = ['some secret key', 'and also the old one'];

  if (process.env.NODE_ENV === 'production') {
    provider.app.proxy = true;
    set(config, 'cookies.short.secure', true);
    set(config, 'cookies.long.secure', true);

    provider.app.middleware.unshift(async (ctx, next) => {
      if (ctx.secure) {
        await next();
      } else if (ctx.method === 'GET' || ctx.method === 'HEAD') {
        ctx.redirect(ctx.href.replace(/^http:\/\//i, 'https://'));
      } else {
        ctx.body = {
          error: 'invalid_request',
          error_description: 'do yourself a favor and only use https',
        };
        ctx.status = 400;
      }
    });
  }

  const router = new Router();

  router.get('/interaction/:grant', async (ctx, next) => {
    const details = await provider.interactionDetails(ctx.req);
    const client = await provider.Client.find(details.params.client_id);

    if (details.interaction.error === 'login_required') {
      await ctx.render('login', {
        client,
        details,
        title: 'Sign-in',
        debug: querystring.stringify(details.params, ',<br/>', ' = ', {
          encodeURIComponent: value => value,
        }),
        interaction: querystring.stringify(details.interaction, ',<br/>', ' = ', {
          encodeURIComponent: value => value,
        }),
      });
    } else {
      await ctx.render('interaction', {
        client,
        details,
        title: 'Authorize',
        debug: querystring.stringify(details.params, ',<br/>', ' = ', {
          encodeURIComponent: value => value,
        }),
        interaction: querystring.stringify(details.interaction, ',<br/>', ' = ', {
          encodeURIComponent: value => value,
        }),
      });
    }

    await next();
  });

  const body = bodyParser();

  router.post('/interaction/:grant/confirm', body, async (ctx, next) => {
    const result = { consent: {} };
    await provider.interactionFinished(ctx.req, ctx.res, result);
    await next();
  });

  router.post('/interaction/:grant/login', body, async (ctx, next) => {
    const account = await Account.findByLogin(ctx.request.body.login, ctx.request.body.password);
    const result = {
      login: {
        account: account.accountId,
        acr: 'urn:mace:incommon:iap:bronze',
        amr: ['pwd'],
        remember: !!ctx.request.body.remember,
        ts: Math.floor(Date.now() / 1000),
      },
      consent: {},
    };

    await provider.interactionFinished(ctx.req, ctx.res, result);
    await next();
  });

  provider.app.use(router.routes());
})
  .then(() => provider.app.listen(port))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
