const fs = require("fs");
module.exports.certificates = JSON.parse(fs.readFileSync("key").toString());