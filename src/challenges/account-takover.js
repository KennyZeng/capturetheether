
require('dotenv-safe').config();
const assert = require('assert')
const utils = require('web3-utils')
const path = require('path')
const EthereumTx = require('ethereumjs-tx')
const EC = require('elliptic').ec
const R = require('ramda')
const {
  bufferToHex,
  privateToAddress,
  toChecksumAddress,
} = require('ethereumjs-util')

/**
 * @typedef {import('bn.js')} BN
 */

const { createWeb3, network } = require('../web3')
const { createContract } = require('../contracts')
const { createDeployedStore, deployedStorePath } = require('../deployed')
const { hex32ToAddress, bell, sendAllEther } = require('../utils')

const CHALLENGE_CONTRACT_NAME = 'AccountTakeoverChallenge'
const ACCOUNT_TO_HACK = '0x6B477781b0e68031109f21887e6B5afEAaEB002b'

const debug = require('debug')('app')
const web3 = createWeb3()

const { toHex, stringToHex, padLeft, BN } = utils

/*

 Look at the first two transactions from this account. They have the same `r` parameter!

*/

// https://ropsten.etherscan.io/getRawTx?tx=0xd79fc80e7b787802602f3317b7fe67765c14a7d40c3e0dcb266e63657f881396
const TX1_RAW = 'f86b80843b9aca008252089492b28647ae1f3264661f72fb2eb9625a89d88a31881111d67bb1bb00008029a069a726edfb4b802cbf267d5fd1dabcea39d3d7b4bf62b9eeaeba387606167166a07724cedeb923f374bef4e05c97426a918123cc4fec7b07903839f12517e1b3c8'

// https://ropsten.etherscan.io/getRawTx?tx=0x061bf0b4b5fdb64ac475795e9bc5a3978f985919ce6747ce2cfbbcaccaf51009
const TX2_RAW = 'f86b01843b9aca008252089492b28647ae1f3264661f72fb2eb9625a89d88a31881922e95bca330e008029a069a726edfb4b802cbf267d5fd1dabcea39d3d7b4bf62b9eeaeba387606167166a02bbd9c2a6285c2b43e728b17bda36a81653dd5f4612a2e0aefdb48043c5108de'

/**
 * Returns possible private key candidates. Only one of them will match the address.
 * @param {BN} r
 * @param {BN} s1
 * @param {BN} s2
 * @param {BN} z1
 * @param {BN} z2
 * @returns {BN[]}
 */
function recoverPrivateKey(r, s1, s2, z1, z2) {
  // https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm
  // https://web.archive.org/web/20180908072307/https://nilsschneider.net/2013/01/28/recovering-bitcoin-private-keys.html
  // https://bitcoin.stackexchange.com/a/35850

  const ec = new EC('secp256k1')
  /*
         z1 - z2
    k = ---------
         s1 - s2
   */
  const kCandidates = [
    z1.sub(z2).umod(ec.n).mul(s1.sub(s2).invm(ec.n)).umod(ec.n),
    z1.sub(z2).umod(ec.n).mul(s1.add(s2).invm(ec.n)).umod(ec.n),
    z1.sub(z2).umod(ec.n).mul(s1.neg().add(s2).invm(ec.n)).umod(ec.n),
    z1.sub(z2).umod(ec.n).mul(s1.neg().sub(s2).invm(ec.n)).umod(ec.n),
  ]
  .filter(k => r.eq(ec.curve.g.mul(k).x))

  /*
        sk - z
  dA = -----------
           r
  */
  const results = kCandidates
    .map(k => s1.mul(k).sub(z1).umod(ec.n).mul(r.invm(ec.n)).umod(ec.n))

  return results
}

const privKeyToAddress = R.compose(
  toChecksumAddress,
  bufferToHex,
  privateToAddress,
)

async function main() {
  const store = createDeployedStore(deployedStorePath(network))

  const $createContract = createContract(web3, {
    gas: 2000000,
    from: web3.eth.defaultAccount,
  })

  const tx1 = new EthereumTx(Buffer.from(TX1_RAW, 'hex'))
  const tx2 = new EthereumTx(Buffer.from(TX2_RAW, 'hex'))

  const r1 = new BN(tx1.r)
  const s1 = new BN(tx1.s)

  const r2 = new BN(tx2.r)
  const s2 = new BN(tx2.s)

  assert(r1.eq(r2), 'signature `r` in the two transactions must be equal')

  const z1 = new BN(tx1.hash(false))
  const z2 = new BN(tx2.hash(false))

  const privateKey = R.head(
    recoverPrivateKey(r1, s1, s2, z1, z2)
      .map(n => toHex(n))
      .filter(pk => privKeyToAddress(pk) === ACCOUNT_TO_HACK)
  )

  debug({ privateKey })
  assert(privateKey, 'Failed to recover private key!')

  const challenge = await Promise.resolve(CHALLENGE_CONTRACT_NAME)
    .then(contractName => {
      const address = store.get(contractName)
      const instance = $createContract(contractName, address)
      return (
        address
          ? instance
          : instance
              .deploy()
              .send()
              .then(inst => {
                assert(inst.options.address, 'No contract address!')
                debug('deployed new contract', contractName, 'at', inst.options.address)
                store.set(contractName, inst.options.address)
                return inst
              })
      )
  })

  let isComplete = await challenge.methods.isComplete().call()
  debug({ isComplete })
  if (isComplete) { return }

  const acc = web3.eth.accounts.privateKeyToAccount(privateKey)
  assert.equal(acc.address, ACCOUNT_TO_HACK)

  web3.eth.accounts.wallet.add(acc)
  await web3.eth.sendTransaction({
    to: acc.address,
    gas: 21000,
    value: utils.toWei('0.01', 'ether')
  })

  await challenge.methods.authenticate().send({ from: acc.address })

  isComplete = await challenge.methods.isComplete().call()
  debug({ isComplete })

  await sendAllEther(web3, acc.address, web3.eth.defaultAccount)
}

main()
