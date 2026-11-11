const { getSentryExpoConfig } = require("@sentry/react-native/metro");

// getSentryExpoConfig wraps Expo's default Metro config with the bits
// Sentry needs for readable stack traces (debug IDs embedded in each
// bundle). It's a strict superset of getDefaultConfig — nothing else here
// changes if you remove Sentry later.
module.exports = getSentryExpoConfig(__dirname);
