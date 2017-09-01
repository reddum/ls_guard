const store = new Map();
const logins = new Map();
const uuid = require('uuid');
const dotenv = require("dotenv");
const mysql = require("mysql");
const crypto = require("crypto");

dotenv.config();

class Account {
  constructor(id) {
    this.accountId = id || uuid();
    store.set(this.accountId, this);
  }

  claims() {
    return {
      sub: this.accountId, 
    };
  }

  static async findByLogin(id, password) {
    return new Promise((resolve, reject) => {
      if (!logins.get(id)) {
        var connection = mysql.createConnection({
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASS,
          database: process.env.DB_SCHEMA,
        });
        connection.connect();
        var sql = "SELECT * FROM members WHERE name=?";
        
        connection.query(sql, [id], function (error, results, fields) {
          if (error)  {
            reject(error);
            return;
          }
          var md5 = crypto.createHash("md5");
          md5.update(password);

          if (results.length == 0) {
            reject("[Error][Account] No such user : " + id);
            return;
          }

          if (md5.digest("hex") == results[0].password) {
            logins.set(id, new Account(id));
            resolve(logins.get(id));
          } else {
            reject("[Error][Account] Password not match");
          }
        });
        connection.end();
      } else {
        resolve(logins.get(id));
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