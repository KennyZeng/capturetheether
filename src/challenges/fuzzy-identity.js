require('dotenv-safe').config();
const assert = require('assert')
const utils = require('web3-utils')
const path = require('path')

const { createWeb3, network } = require('../web3')
const { createContract } = require('../contracts')
const { createDeployedStore, deployedStorePath } = require('../deployed')
const { bell, makeContractAddress } = require('../utils')
const { createJsonStorage } = require('../json-storage')

const debug = require('debug')('app:index')

const CHALLENGE_CONTRACT_NAME = 'FuzzyIdentityChallenge'
const SOLUTION_CONTRACT_NAME = 'FuzzyIdentitySolution'
const SOLUTION_DB_PATH = path.resolve(process.cwd(), 'db', 'fuzzy-identity.json')
debug({ SOLUTION_DB_PATH })

const web3 = createWeb3()
const isDevelopNetwork = network === 'develop'

const { accounts } = web3.eth

const {
  BN,
  hexToNumberString,
  hexToNumber,
  toHex
} = utils;

async function main() {
  debug({ network })
  const store = createDeployedStore(deployedStorePath(network))
  const solutionDB = createJsonStorage(SOLUTION_DB_PATH)

  const $createContract = createContract(web3, {
    gas: 2000000,
    from: web3.eth.defaultAccount,
  })

  const challenge = await Promise.resolve(CHALLENGE_CONTRACT_NAME)
    .then(async (contractName) => {
      const address = store.get(contractName)
      const instance = $createContract(contractName, address)

      if (!isDevelopNetwork) { return instance }

      const code = address ? (await web3.eth.getCode(address)) : '0x0'
      return (
        (address && code !== '0x0')
          ? instance
          : instance
              .deploy()
              .send({ })
              .then(inst => {
                assert(inst.options.address, 'No contract address!')
                debug('deployed new contract', contractName, 'at', inst.options.address)
                store.set(contractName, inst.options.address)
                return inst
              })
      )
  })

  const isComplete = await challenge.methods.isComplete().call()
  debug({ isComplete })
  if (isComplete) { return }

  const DATA_KEY = 'bruteForced'

  function bruteForce() {
    debug('Brute forcing a new account that will create a contract with address containing "badc0de"')
    debug('This can take a lot of time...')
    const bruteForced = bruteForceAccount(10000000, 'badc0de')
    if (bruteForced) {
      debug({ bruteForced })
      return solutionDB.set(DATA_KEY, bruteForced)
    } else {
      debug('No appropriate account found :(')
    }
  }

  const { privateKey, address, contractAddress, nonce } = solutionDB.get(DATA_KEY) || bruteForce() || {}
  if (!address) {
    throw new Error('No account!')
  }

  const account = accounts.privateKeyToAccount(privateKey)
  accounts.wallet.add(account)
  debug('Using a new account', account)

  await (async function fundAccount() {
    debug('funding account')
    const balance = new BN(await web3.eth.getBalance(account.address))
    debug({ balance: utils.fromWei(balance, 'ether') })
    const required = new BN(utils.toWei('1', 'ether'))
    const missing = required.sub(balance)
    debug({ missing: utils.fromWei(missing, 'ether') })
    if (!missing.isNeg() && !missing.isZero()) {
      return web3.eth.sendTransaction({
        from: web3.eth.defaultAccount,
        to: account.address,
        gas: 50000,
        value: missing.toString()
      })
    }
  }())

  const transactionsCount = await web3.eth.getTransactionCount(account.address)
  debug({ transactionsCount })

  let counter = transactionsCount
  while (counter <= nonce) {
    debug({ counter })
    const solution = await Promise.resolve(SOLUTION_CONTRACT_NAME)
      .then(contractName => {
        const address = store.get(contractName)
        const instance = $createContract(contractName, undefined)
        return (
          instance
            .deploy()
            .send({
              from: account.address,
              gas: 2000000,
            })
            .then(inst => {
              assert(inst.options.address, 'No contract address!')
              debug('deployed new contract', contractName, 'at', inst.options.address)
              return inst
            })
          )
        }
      )

    if (sameAddresses(solution.options.address, contractAddress)) {
      debug('Address found!', solution.options.address)
      const recipe = await solution.methods.solve(challenge.options.address).send()
      debug({ recipe })

      const isComplete = await challenge.methods.isComplete().call()
      debug({ isComplete })
      break;
    }
    counter++
  }

  await (async function sendBackRemainingFunds(){
    debug('Sending back remaining balance')
    const remainingBalance = new BN(await web3.eth.getBalance(account.address))
    const gasPrice = new BN(await web3.eth.getGasPrice())
    const toSend = remainingBalance.sub(gasPrice.muln(21000))
    debug({ toSend: toSend.toString() })

    if (toSend.isZero()) { return }
    if (toSend.isNeg()) { return }

    await web3.eth.sendTransaction({
      from: account.address,
      to: web3.eth.defaultAccount,
      gas: 21000,
      value: toSend.toString(),
    })
  }())
}

/**
 *
 * @param {number} num
 * @param {string} word
 */
function bruteForceAccount(num, word) {
  for (let i = 0; i < num; i++) {
    const account = accounts.create()
    const found = testAddress(account.address, word, 10)
    if (found) {
      bell()
      const { privateKey, address } = account
      return {
        privateKey,
        address,
        ...found
      }
    }
    if ((i % 1000) === 0) {
      const progress = (i / num * 100).toFixed(2) + ' %'
      debug({ progress })
    }
  }

  bell()

  /**
   * @param {string} accountAddress
   * @param {string} word
   * @param {number} count
   */
  function testAddress(accountAddress, word, count) {
    for (let nonce = 0; nonce < count ; nonce++) {
      const contractAddress = makeContractAddress(accountAddress, nonce)
      if (contractAddress.indexOf(word) > -1) {
        return ({
          contractAddress,
          nonce,
        })
      }
    }
  }
}

/**
 *
 * @param {string} a1
 * @param {string} a2
 */
function sameAddresses(a1, a2) {
  return a1.toLowerCase() === a2.toLowerCase()
}

main()
