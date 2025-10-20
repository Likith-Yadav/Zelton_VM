const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Reduce file watching to avoid ENOSPC error
config.watchFolders = [];
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Disable file watching for node_modules
config.watcher = {
  additionalExts: ['cjs', 'mjs'],
  watchman: {
    deferStates: ['hg.update'],
  },
};

// Reduce the number of files being watched
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;