// @ts-check
const { curry } = require('ramda')
const debug = require('debug')('app:contracts')

const createContract = curry(
  /**
   * @param {import('web3')} web3
   * @param {object} options
   * @param {?string} options.from
   * @param {?string} options.gasPrice
   * @param {?number} options.gas
   * @param {string} name - Contract name
   * @param {?string} address - Deployed contract address
   */
  (web3, options, name, address) => {
    debug('loadContract', { options, name, address })

    const truffleJson = require(`../build/contracts/${name}.json`)

    const contractOptions = {
      ...options,
      data: truffleJson.bytecode,
    }

    const contract = new web3.eth.Contract(truffleJson.abi, address, contractOptions)
    return contract
})

const loadJson = (path) => {
  return JSON.parse(fs.readFileSync(path, { encoding: 'utf-8' }))
}

module.exports = {
  createContract,
}
