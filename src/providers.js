const Web3 = require('web3')

module.exports = {
  ropsten: () => new Web3.providers.HttpProvider(process.env.HTTP_PROVIDER_URL),
  develop: () => new Web3.providers.HttpProvider(process.env.HTTP_PROVIDER_URL),
}
