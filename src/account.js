const assert = require('assert')
const debug = require('debug')('app:account')

/**
 * @param {import('web3')} web3
 */
function setupDefaultAccount(web3) {
  assert(process.env.PRIVATE_KEY, 'missing env variable PRIVATE_KEY')
  const account = web3.eth.accounts.privateKeyToAccount('0x' + process.env.PRIVATE_KEY)
  web3.eth.accounts.wallet.add(account)
  web3.eth.defaultAccount = account.address
  debug('default account', account.address)
}

module.exports = {
  setupDefaultAccount,
}
