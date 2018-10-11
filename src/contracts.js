// @ts-check
const { curry } = require('ramda')
const fs = require('fs')
const debug = require('debug')('app:contracts')

const DEPLOYED_CONTRACTS_STORE_PATH = 'deployed.ropsten.json'

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

/**
 * @param {string} path
 * @param {object} data
 */
const saveJson = (path, data) => {
  fs.writeFileSync(path, JSON.stringify(data, null, 2), { encoding: 'utf-8' })
}

const getDeployedAddress = curry(
  /**
   * @param {string} storePath - JSON store path
   * @param {string} name - Contract name
   * @returns {?string}
   */
  (storePath, name) => {
    if (fs.existsSync(storePath)) {
      const json = loadJson(storePath)
      return json[name]
    } else {
      return undefined
    }
  }
)

const setDeployedAddress = curry(
  /**
   * @param {string} storePath - JSON store path
   * @param {string} name - Contract name
   * @param {string} address - Contract address
   */
  (storePath, name, address) => {
    const json = fs.existsSync(storePath)
      ? loadJson(storePath)
      : {}
    json[name] = address
    saveJson(storePath, json)
    return address
  }
)


/**
 * @param {string} storePath
 */
function createDeployedStore(storePath) {
  return {
    /**
     * @param {string} contractName
     */
    get(contractName) {
      return getDeployedAddress(storePath, contractName)
    },

    /**
     * @param {string} contractName
     * @param {string} address
     */
    set(contractName, address) {
      return setDeployedAddress(storePath, contractName, address)
    }
  }
}

module.exports = {
  DEPLOYED_CONTRACTS_STORE_PATH,
  getDeployedAddress,
  setDeployedAddress,
  createDeployedStore,
  createContract,
}
