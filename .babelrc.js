module.exports = (api) => {
  const env = process.env.BABEL_ENV || process.env.NODE_ENV || 'development';
  api.cache(() => env);

  return {
    presets: [
      ['@babel/preset-env', {
        modules: env === 'test' ? 'commonjs' : false,
        loose: true,
        targets: env === 'test' ? { node: 'current' } : null,
      }],
    ],
    plugins: env === 'test' ? ['istanbul'] : [],
  };
};
