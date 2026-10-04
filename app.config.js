module.exports = ({ config }) => {
  if (process.env.APP_VARIANT !== 'homologacao') return config;
  return {
    ...config,
    name: 'BistroHub Homologação',
    slug: 'matheus-sampaio-homologacao',
    extra: {
      ...config.extra,
      eas: { ...config.extra?.eas, projectId: '2cffbcaa-f4d7-423c-85c7-81131ca55310' },
    },
    android: {
      ...config.android,
      package: 'com.wooxonly.comandadigitalprint.homologacao',
    },
  };
};
