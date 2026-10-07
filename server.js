const app = require('./backend/dist/app').default || require('./backend/src/app').default || require('./backend/src/app');

module.exports = app;
module.exports.default = app;
