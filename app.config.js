module.exports = ({ config }) => {
  if (process.env.EXPO_PUBLIC_WEB_APP === '1') {
    config = { ...config, web: { ...config.web, output: 'single' }, experiments: { ...config.experiments, baseUrl: process.env.EXPO_PUBLIC_WEB_BASE_PATH || '' } };
  }
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
