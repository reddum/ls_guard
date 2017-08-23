//http://localhost:3000/auth?client_id=newhire&redirect_uri=http://ct.com:5000/&response_type=code&scope=openid


const Provider = require("oidc-provider");
const path = require("path");
const { set } = require("lodash");
const bodyParser = require("koa-body");
const querystring = require("querystring");
const Router = require("koa-router");
const render = require("koa-ejs");

const dotenv = require("dotenv");
dotenv.config();

const Account = require("./account");
const { config } = require("./config");
config.findById = Account.findById;

const { clients } = require("./clients");
const { certificates } = require("./certificates");

const issuer = process.env.ISSUER || "http://localhost:3000";
const port = process.env.PORT || 3000;
const provider = new Provider(issuer, config);

provider.defaultHttpOptions = { timeout: 15000 };

provider
  .initialize({
    adapter: process.env.MONGODB_URI
      ? require("./adapters/mongodb")
      : undefined, // eslint-disable-line global-require
    clients,
    keystore: { keys: certificates }
  })
  .then(() => {
    render(provider.app, {
      cache: false,
      layout: "_layout",
      root: path.join(__dirname, "views")
    });

    provider.app.keys = ["some secret key", "and also the old one"];

    if (process.env.NODE_ENV === "production") {
      provider.app.proxy = true;
      set(config, "cookies.short.secure", true);
      set(config, "cookies.long.secure", true);

      provider.app.middleware.unshift(async (ctx, next) => {
        if (ctx.secure) {
          await next();
        } else if (ctx.method === "GET" || ctx.method === "HEAD") {
          ctx.redirect(ctx.href.replace(/^http:\/\//i, "https://"));
        } else {
          ctx.body = {
            error: "invalid_request",
            error_description: "do yourself a favor and only use https"
          };
          ctx.status = 400;
        }
      });
    }

    const router = new Router();

    router.get("/interaction/:grant", async (ctx, next) => {
      const details = await provider.interactionDetails(ctx.req);
      console.log("details", details);
      const client = await provider.Client.find(details.params.client_id);
      console.log("details.interaction.error", details.interaction.error);
      if (details.interaction.error === "login_required") {
        await ctx.render("login", {
          client,
          details,
          title: "Sign-in",
          debug: querystring.stringify(details.params, ",<br/>", " = ", {
            encodeURIComponent: value => value
          }),
          interaction: querystring.stringify(
            details.interaction,
            ",<br/>",
            " = ",
            {
              encodeURIComponent: value => value
            }
          )
        });
      } else {
        await ctx.render("interaction", {
          client,
          details,
          title: "Authorize",
          debug: querystring.stringify(details.params, ",<br/>", " = ", {
            encodeURIComponent: value => value
          }),
          interaction: querystring.stringify(
            details.interaction,
            ",<br/>",
            " = ",
            {
              encodeURIComponent: value => value
            }
          )
        });
      }

      await next();
    });

    const body = bodyParser();

    router.post("/interaction/:grant/confirm", body, async (ctx, next) => {
      const result = { consent: {} };
      await provider.interactionFinished(ctx.req, ctx.res, result);
      await next();
    });

    router.post("/interaction/:grant/login", body, async (ctx, next) => {
      const account = await Account.findByLogin(
        ctx.request.body.login,
        ctx.request.body.password
      );
      const result = {
        login: {
          account: account.accountId,
          acr: "urn:mace:incommon:iap:bronze",
          amr: ["pwd"],
          remember: !!ctx.request.body.remember,
          ts: Math.floor(Date.now() / 1000)
        },
        consent: {}
      };

      await provider.interactionFinished(ctx.req, ctx.res, result);
      await next();
    });
    provider.app.use(router.routes());
  })
  .then(() => {
    console.log('server running at ' + port)
    provider.app.listen(port);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });


provider.on('server_error', (err, ctx) => {
  console.log(err);
});