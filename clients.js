module.exports.clients = [
  {
    client_id: "newhire",
    redirect_uris: ["http://ct.com:5000/"],
    response_types: ["code"],
    grant_types: ["authorization_code"],
    token_endpoint_auth_method: "none"
  }
];