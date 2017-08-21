const pkg = require('./package.json');

module.exports.config = {
  acrValues: ['session', 'urn:mace:incommon:iap:bronze'],
  cookies: {
    long: { signed: true, maxAge: (1 * 24 * 60 * 60) * 1000 }, // 1 day in ms
    short: { signed: true },
  },
  discovery: {
    service_documentation: pkg.homepage,
    version: pkg.version,
  },
  claims: {
    amr: null,
    address: ['address'],
    email: ['email', 'email_verified'],
    phone: ['phone_number', 'phone_number_verified'],
    profile: ['birthdate', 'family_name', 'gender', 'given_name', 'locale', 'middle_name', 'name',
      'nickname', 'picture', 'preferred_username', 'profile', 'updated_at', 'website', 'zoneinfo'],
  },
  features: {
    devInteractions: false,
    claimsParameter: true,
    encryption: true,
    introspection: true,
    registration: true,
    request: true,
    requestUri: { requireRequestUriRegistration: false },
    revocation: true,
    sessionManagement: true,
    backchannelLogout: true,
  },
  subjectTypes: ['public', 'pairwise'],
  pairwiseSalt: 'da1c442b365b563dfc121f285a11eedee5bbff7110d55c88',
  interactionUrl: function interactionUrl(ctx, interaction) { // eslint-disable-line no-unused-vars
    return `/interaction/${ctx.oidc.uuid}`;
  },
  ttl: {
    AccessToken: 1 * 60 * 60, // 1 hour in seconds
    AuthorizationCode: 10 * 60, // 10 minutes in seconds
    ClientCredentials: 10 * 60, // 10 minutes in seconds
    IdToken: 1 * 60 * 60, // 1 hour in seconds
    RefreshToken: 1 * 24 * 60 * 60, // 1 day in seconds
  },
};