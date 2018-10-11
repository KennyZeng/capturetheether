const Web3 = require('web3')
const { ropsten } = require('./providers')
const { setupDefaultAccount } = require('./account')

function createWeb3() {
  const web3 = new Web3(ropsten)
  setupDefaultAccount(web3)
  return web3
}
module.exports = { createWeb3 }
