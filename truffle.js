require('dotenv-safe').config();
const { ropsten, develop } = require('./src/providers')

module.exports = {
  networks: {
    ropsten: {
      provider: ropsten(),
      network_id: 3,
    },
    develop: {
      provider: develop(),
      network_id: 5777,
    },
  },
}
