require('dotenv-safe').config();
const assert = require('assert')
const utils = require('web3-utils')
const path = require('path')
const EthereumTx = require('ethereumjs-tx')
const {
  bufferToHex,
} = require('ethereumjs-util')

const { createWeb3, network } = require('../web3')
const { createContract } = require('../contracts')
const { createDeployedStore, deployedStorePath } = require('../deployed')
const { hex32ToAddress, bell } = require('../utils')

const CHALLENGE_CONTRACT_NAME = 'PublicKeyChallenge'
const ADDRESS = '0x92b28647ae1f3264661f72fb2eb9625a89d88a31'

// found on etherscan: https://ropsten.etherscan.io/address/0x92b28647ae1f3264661f72fb2eb9625a89d88a31
const TX_HASH = '0xabc467bedd1d17462fcc7942d0af7874d6f8bdefee2b299c9168a216d3ff0edb'

if (network !== 'ropsten') {
  console.log('')
  console.log('    This challenge only works on Ropsten network.')
  console.log('    It requires an existing transaction from which we can recover the public key')
  console.log('')
  process.exit(1)
}

const debug = require('debug')('app')
const web3 = createWeb3()
async function main() {
  const store = createDeployedStore(deployedStorePath(network))

  const $createContract = createContract(web3, {
    gas: 2000000,
    from: web3.eth.defaultAccount,
  })

  const challenge = await Promise.resolve(CHALLENGE_CONTRACT_NAME)
    .then((contractName) => {
      const address = store.get(contractName)
      return $createContract(contractName, address)
    })

  let isComplete = await challenge.methods.isComplete().call()
  debug({ isComplete })
  if (isComplete) { return }

  const tx = await web3.eth.getTransaction(TX_HASH)
  const txParams = {
    nonce: tx.nonce,
    gasPrice: utils.toHex(tx.gasPrice),
    gasLimit: utils.toHex(tx.gas),
    to: tx.to,
    value: utils.toHex(tx.value),
    data: tx.input,
    v: tx.v,
    r: tx.r,
    s: tx.s,
    // EIP 155 chainId - mainnet: 1, ropsten: 3
    chainId: 3
  }
  debug({ txParams })
  const _tx = new EthereumTx(txParams)

  const from = bufferToHex(_tx.from)
  const to = bufferToHex(_tx.to)
  const publicKey = bufferToHex(_tx.getSenderPublicKey())

  assert.equal(from, ADDRESS)
  debug({ from, to, publicKey })

  const recipe = await challenge.methods.authenticate(publicKey).send()
  debug({ recipe })

  isComplete = await challenge.methods.isComplete().call()
  debug({ isComplete })
}

main()
