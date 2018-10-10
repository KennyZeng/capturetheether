// @ts-check
const { curry } = require('ramda')
const debug = require('debug')('app:contracts')

const loadContract = curry(
  /**
   * @param {import('web3')} web3
   * @param {object} options
   * @param {?string} options.from
   * @param {?string} options.gasPrice
   * @param {?number} options.gas
   * @param {?string} options.data
   * @param {string} name - Contract name
   * @param {?string} address - Deployed contract address
   */
  (web3, options, name, address) => {
    debug('loadContract', { options, name, address })

    const truffleJson = require(`../build/contracts/${name}.json`)
    const contract = new web3.eth.Contract(truffleJson.abi, address, options)
    return contract
})

module.exports = {
  loadContract,
}
