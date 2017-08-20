const store = new Map();
const logins = new Map();
const uuid = require('uuid');

class Account {
  constructor(id) {
    this.accountId = id || uuid();
    store.set(this.accountId, this);
  }

  claims() {
    return {
      sub: this.accountId, // it is essential to always return a sub claim
    };
  }

  static findByLogin(login) {
    if (!logins.get(login)) {
      logins.set(login, new Account());
    }

    return Promise.resolve(logins.get(login));
  }

  static async findById(ctx, id, token) { // eslint-disable-line no-unused-vars
    // token is a reference to the token used for which a given account is being loaded,
    //   it is undefined in scenarios where account claims are returned from authorization endpoint
    // ctx is the koa request context
    if (!store.get(id)) new Account(id); // eslint-disable-line no-new
    return store.get(id);
  }
}

module.exports = Account;