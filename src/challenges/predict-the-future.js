require('dotenv-safe').config();

const assert = require('assert')
const utils = require('web3-utils')
const { createWeb3, network } = require('../web3')
const { createContract } = require('../contracts')
const { createDeployedStore, deployedStorePath } = require('../deployed')
const { hex32ToAddress } = require('../utils')

const debug = require('debug')('app:index')

const web3 = createWeb3()

const CHALLENGE_CONTRACT_NAME = 'PredictTheFuture'
const SOLUTION_CONTRACT_NAME = 'PredictTheFutureSolution'

async function main() {
  const store = createDeployedStore(deployedStorePath(network))
  const GUESS = 5

  const $createContract = createContract(web3, {
    gas: 2000000,
    from: web3.eth.defaultAccount,
  })

  const challenge = await Promise.resolve(CHALLENGE_CONTRACT_NAME)
    .then(contractName => {
      const address = store.get(contractName)
      const instance = $createContract(contractName, address)
      return (
        address
          ? instance
          : instance
              .deploy()
              .send({
                value: utils.toWei('1', 'ether')
              }).then(inst => {
                assert(inst.options.address, 'No contract address!')
                debug('deployed new contract', contractName, 'at', inst.options.address)
                store.set(contractName, inst.options.address)
                return inst
              })
      )
  })

  const solution = await Promise.resolve(SOLUTION_CONTRACT_NAME)
    .then((contractName) => {
      const address = store.get(contractName)
      const instance = $createContract(contractName, address)
      return (
        address
          ? instance
          : instance
              .deploy().send().then(inst => {
                assert(inst.options.address, 'No contract address!')
                debug('deployed new contract', contractName, 'at', inst.options.address)
                store.set(contractName, inst.options.address)
                return inst
              })
      )
    })

  const getStorageAt = (position) => web3.eth.getStorageAt(challenge.options.address, position)

  async function getStorage() {
    return Promise.all([
      getStorageAt(0),
      getStorageAt(1).then(utils.hexToNumber),
    ]).then(([ guesserAndGuess, settlementBlockNumber ]) => {
      const x = utils.toBN(guesserAndGuess)
      const guess = x.shrn(20 * 8).toNumber()
      const guesser = hex32ToAddress(guesserAndGuess)
      return {
        guess,
        guesser,
        settlementBlockNumber: Number(settlementBlockNumber),
      }
    })
  }

  let storage = await getStorage()
  debug({ storage })

  if (storage.settlementBlockNumber === 0) {
    await solution.methods.lockInGuess(challenge.options.address, GUESS).send({
      value: utils.toWei('1', 'ether')
    })
    debug({ storage: await getStorage() })
  }

  let counter = 0
  const max = 20

  while (counter++ < max) {
    debug('Attempt #%d', counter)
    const isComplete = await challenge.methods.isComplete().call()
    debug({ isComplete })

    if (isComplete) { break }

    await solution.methods.trySettle(challenge.options.address, GUESS).send()
  }
}

main()
