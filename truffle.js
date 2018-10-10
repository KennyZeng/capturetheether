require('dotenv-safe').config();
const { ropsten } = require('./src/providers')

module.exports = {
  networks: {
    ropsten: {
      provider: ropsten,
      network_id: 3,
    }
  }
}
