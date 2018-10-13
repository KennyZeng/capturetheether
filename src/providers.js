const Web3 = require('web3')

module.exports = {
  ropsten: new Web3.providers.HttpProvider(process.env.ROPSTEN_URL),
  develop: new Web3.providers.HttpProvider('http://127.0.0.1:7545'),
}
