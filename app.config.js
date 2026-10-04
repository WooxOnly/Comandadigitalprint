module.exports = ({ config }) => {
  if (process.env.APP_VARIANT !== 'homologacao') return config;
  return {
    ...config,
    name: 'BistroHub Homologação',
    android: {
      ...config.android,
      package: 'com.wooxonly.comandadigitalprint.homologacao',
    },
  };
};
