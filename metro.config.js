const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    blockList: [
      /android[\\/]\.gradle[\\/].*/,
      /android[\\/]build[\\/].*/,
      /android[\\/]app[\\/]build[\\/].*/,
      /bundle\.js$/,
      /\.bundle[\\/].*/,
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
