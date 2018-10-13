const utils = require('web3-utils')
const assert = require('assert')
const BN = utils.BN
const ADDRESS_MASK = new BN('000000000000000000000000ffffffffffffffffffffffffffffffffffffffff', 16)

function hex32ToAddress(hex) {
  const n = new BN(hex.slice(2), 16).and(ADDRESS_MASK)
  const addr = utils.padLeft(utils.toHex(n), 40)
  assert(utils.isAddress(addr), `"${addr}" is not a valid address`)
  return addr
}

module.exports = {
  hex32ToAddress,
}
