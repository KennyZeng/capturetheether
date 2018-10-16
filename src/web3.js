const Web3 = require('web3')
const providers = require('./providers')
const assert = require('assert')
const { setupDefaultAccount } = require('./account')

const network = process.env.NETWORK || 'develop'

const provider = providers[network]
assert(provider, `No provider found for "${network}" network`)

function createWeb3() {
  const web3 = new Web3(provider())
  setupDefaultAccount(web3)
  return web3
}
module.exports = { createWeb3, network }
