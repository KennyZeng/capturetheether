require('dotenv-safe').config();
const assert = require('assert')
const debug = require('debug')('app:index')
const { createWeb3 } = require('../web3')
const {
  DEPLOYED_CONTRACTS_STORE_PATH,
  createContract,
  createDeployedStore,
} = require('../contracts')

const CHALLENGE_CONTRACT_NAME = 'PredictTheBlockHashChallenge'
const SOLUTION_CONTRACT_NAME = 'PredictTheBlockHashSolution'

const web3 = createWeb3()

async function main() {
  const store = createDeployedStore(DEPLOYED_CONTRACTS_STORE_PATH)

  const $createContract = createContract(web3, {
    gas: 1000000,
    from: web3.eth.defaultAccount,
  })

  const challenge = $createContract(CHALLENGE_CONTRACT_NAME, store.get(CHALLENGE_CONTRACT_NAME))

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

  const isComplete = await challenge.methods.isComplete().call()
  debug( { isComplete })
  if (isComplete) { return }

  let guesser = hex32ToAddress(await web3.eth.getStorageAt(challenge.options.address, 0))
  const guess = await web3.eth.getStorageAt(challenge.options.address, 1)
  let settlementBlockNumber = web3.utils.hexToNumber(await web3.eth.getStorageAt(challenge.options.address, 2))

  debug({ guesser })
  debug({ guess })

  if (settlementBlockNumber === 0) {
    debug('guess not locked in yet')
    await solution.methods.step1(challenge.options.address, '0x0').send({
      value: web3.utils.toWei('1', 'ether')
    })
    settlementBlockNumber = web3.utils.hexToNumber(await web3.eth.getStorageAt(challenge.options.address, 2))
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

function hex32ToAddress(hex) {
  const bytes = web3.utils.hexToBytes(hex)
  assert.equal(bytes.length, 32, 'Invalid hex size')
  const addr = web3.utils.bytesToHex(bytes.slice(12))
  assert(web3.utils.isAddress(addr), `"${addr}" is not a valid address`)
  return addr
}

function sameAddresses(a1, a2) {
  return a1.toLowerCase() === a2.toLowerCase()
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
main()
