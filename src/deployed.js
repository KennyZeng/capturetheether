const { createJsonStorage } = require('./json-storage')
const debug = require('debug')('app:deployed')

const deployedStorePath = (network) => `deployed.${network}.json`

/**
 * @param {string} storePath
 */
function createDeployedStore(storePath) {
  const storage = createJsonStorage(storePath)
  return {
    /**
     * @param {string} contractName
     */
    get(contractName) {
      return storage.get(contractName)
    },

    /**
     * @param {string} contractName
     * @param {string} address
     */
    set(contractName, address) {
      return storage.set(contractName, address)
    }
  }
}

module.exports = {
  deployedStorePath,
  createDeployedStore,
}
