require('dotenv-safe').config();

const { createWeb3 } = require('../web3')
const {
  DEPLOYED_CONTRACTS_STORE_PATH,
  createContract,
  createDeployedStore,
} = require('../contracts')

const debug = require('debug')('app:index')

const web3 = createWeb3()

const CHALLENGE_CONTRACT_NAME = 'PredictTheFuture'
const SOLUTION_CONTRACT_NAME = 'PredictTheFutureSolution'

async function main() {
  const store = createDeployedStore(DEPLOYED_CONTRACTS_STORE_PATH)

  const $createContract = createContract(web3, {
    gas: 200000,
    from: web3.eth.defaultAccount,
  })

  const challenge = await Promise.resolve(CHALLENGE_CONTRACT_NAME)
    .then(contractName => $createContract(contractName, store.get(contractName)))

  const solution = await Promise.resolve(SOLUTION_CONTRACT_NAME)
    .then(contractName => $createContract(contractName, store.get(contractName)))

  let counter = 0
  const max = 10

  while (counter++ < max) {
    debug('Attempt #%d', counter)
    const isComplete = await challenge.methods.isComplete().call()
    debug({ isComplete })

    if (isComplete) { break }

    await solution.methods.solve(CHALLENGE_CONTRACT_AT, 5).send()
  }
}

main()
