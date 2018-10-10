require('dotenv-safe').config();
const Web3 = require('web3')

const debug = require('debug')('app:index')

const { ropsten } = require('../providers')
const { setupDefaultAccount } = require('../account')
const { loadContract } = require('../contracts')

const web3 = new Web3(ropsten)

const CHALLENGE_CONTRACT_AT = '0x09D3328010595987311AF3326BfE0BF074FD2782'
const SOLUTION_CONTRACT_AT = '0x05f8883e90abf3ba76bd71ed20218e807b9847d2'

setupDefaultAccount(web3)

async function getBalanceString(address) {
  const eth = web3.utils.fromWei(await web3.eth.getBalance(address), 'ether')
  return `${eth} Eth`
}

async function main() {
  const load = loadContract(web3, {
    gas: 200000,
    from: web3.eth.defaultAccount,
  })

  const instance = await load('PredictTheFuture', CHALLENGE_CONTRACT_AT)

  const solutionInstance = await load('PredictTheFutureSolution', SOLUTION_CONTRACT_AT)

  let counter = 0
  const max = 10

  while (counter++ < max) {
    debug('Attempt #%d', counter)
    const isComplete = await instance.methods.isComplete().call()
    debug({ isComplete })

    if (!isComplete) { break }

    await solutionInstance.methods.solve(CHALLENGE_CONTRACT_AT, 5).send()
  }
}

main()
