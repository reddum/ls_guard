const store = new Map();
const logins = new Map();
const uuid = require('uuid');
const dotenv = require("dotenv");
const mysql = require("mysql");

dotenv.config();

const crypto = require("crypto");

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

  static async findByLogin(login, password) {
    return new Promise((resolve, reject) => {
      if (!logins.get(login)) {
        var connection = mysql.createConnection({
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASS,
          database: process.env.DB_SCHEMA,
        });
        connection.connect();
        var sql = "SELECT * FROM members WHERE name=?";
        
        connection.query(sql, [login], function (error, results, fields) {
          if (error)  {
            reject(error);
          }
          var md5 = crypto.createHash("md5");
          md5.update(password);
          if (md5.digest("hex") == results[0].password) {
            logins.set(login, new Account());
            resolve(logins.get(login));
          }
        });
        connection.end();
      } else {
        resolve(logins.get(login));
      }
    });
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