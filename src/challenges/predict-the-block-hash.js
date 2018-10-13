require('dotenv-safe').config();
const assert = require('assert')
const utils = require('web3-utils')
const { createWeb3, network } = require('../web3')
const { createContract } = require('../contracts')
const { createDeployedStore, deployedStorePath } = require('../deployed')
const { hex32ToAddress } = require('../utils')

const debug = require('debug')('app:index')

const CHALLENGE_CONTRACT_NAME = 'PredictTheBlockHashChallenge'
const SOLUTION_CONTRACT_NAME = 'PredictTheBlockHashSolution'

const web3 = createWeb3()

async function main() {
  const store = createDeployedStore(deployedStorePath(network))

  const $createContract = createContract(web3, {
    gas: 1000000,
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

  const isComplete = await challenge.methods.isComplete().call()
  debug( { isComplete })
  if (isComplete) { return }

  let guesser = await getStorageAt(0).then(hex32ToAddress)
  const guess = await getStorageAt(1)
  let settlementBlockNumber = utils.hexToNumber(await getStorageAt(2))

  debug({ guesser })
  debug({ guess })

  if (settlementBlockNumber === 0) {
    debug('guess not locked in yet')
    await solution.methods.step1(challenge.options.address, '0x0').send({
      value: utils.toWei('1', 'ether')
    })
    settlementBlockNumber = utils.hexToNumber(await getStorageAt(2))
    guesser = solution.options.address
  }

  debug({ solutionAddress: solution.options.address })

  assert(
    sameAddresses(guesser, solution.options.address),
    `The solution contract is different from the one that started the challenge. I'm afraid the money is lost :(`
  )

  debug({ settlementBlockNumber })

  const maxBlockNumber = settlementBlockNumber + 256

  debug('waiting for block', maxBlockNumber)

  while (true) {
    const blockNumber = await web3.eth.getBlockNumber()
    debug('current block number is: %d, to go: %d', blockNumber, Math.max(0, maxBlockNumber - blockNumber))
    if (blockNumber > maxBlockNumber) {
      const receipt = await solution.methods.step2(challenge.options.address).send()
      debug({ receipt })
      const isComplete = await challenge.methods.isComplete().call()
      debug( { isComplete })
      assert(isComplete, 'Challenge is not complete!!!')
      break
    }
    await sleep(30 * 1000)
  }
}

function sameAddresses(a1, a2) {
  return a1.toLowerCase() === a2.toLowerCase()
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
main()
