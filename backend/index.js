const app = require('./dist/app').default || require('./src/app').default || require('./src/app');

module.exports = app;
module.exports.default = app;
