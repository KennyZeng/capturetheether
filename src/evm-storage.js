const { curry } = require('ramda')
const utils = require('web3-utils')

/**
 * @callback GetStorageAt
 * @param {string} position
 * @returns {Promise.<string>}
 */

const storageArray = curry(
  /**
   * @param {GetStorageAt} getStorageAt
   * @param {object} members
   * @param {number} position - Position index in storage
   */
  (getStorageAt, members, position) => {
    const padHex = (n) => utils.padLeft(n, 64).slice(2)
    const hexPosition = padHex(position)
    const memberNames = Object.keys(members)
    const itemSize = memberNames.length

    function getMemberAddress(arrIndex, memberIndex) {
      const addr = utils.toBN(
        utils.soliditySha3(hexPosition)
      ).addn(arrIndex * itemSize)
      return utils.toHex(addr.addn(memberIndex))
    }

    return {
      /**
       * @param {number} index
       */
      async getItem(index) {
        const values = await Promise.all(
          memberNames.map((key) => {
            const memberAddr = getMemberAddress(index, members[key])
            return getStorageAt(memberAddr)
          })
        )

        return memberNames.reduce((acc, e, idx) => ({
          ...acc,
          [e]: values[idx]
        }), {})
      }
    }
  }
)

module.exports = {
  storageArray,
}
