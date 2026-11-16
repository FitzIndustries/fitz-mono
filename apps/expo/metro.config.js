// Expo provides monorepo resolution and cache defaults; avoid depending on
// private/transitive Metro packages that may move between SDK releases.
const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

/** @type {import('expo/metro-config').MetroConfig} */
module.exports = withNativewind(config);
