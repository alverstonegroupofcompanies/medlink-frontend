const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add .cjs and .mjs support
config.resolver.sourceExts.push('cjs', 'mjs');

module.exports = config;
