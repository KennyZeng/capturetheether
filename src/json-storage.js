
// @ts-check
const { curry } = require('ramda')
const fs = require('fs')
const mkdirp = require('mkdirp')
const path = require('path')
const debug = require('debug')('app:json-storage')

/**
 * @param {string} path
 */
const loadJson = (path) => {
  return JSON.parse(fs.readFileSync(path, { encoding: 'utf-8' }))
}

/**
 * @param {string} path
 * @param {object} data
 */
const saveJson = (path, data) => {
  fs.writeFileSync(path, JSON.stringify(data, null, 2), { encoding: 'utf-8' })
}

/**
 * @param {string} storePath
 */
function createJsonStorage(storePath) {
  return {
    /**
     * @param {string} key
     */
    get(key) {
      if (fs.existsSync(storePath)) {
        const json = loadJson(storePath)
        return json[key]
      } else {
        return undefined
      }
    },

    /**
     * @param {string} key
     * @param {*} value
     */
    set(key, value) {
      const dir = path.dirname(storePath)
      mkdirp.sync(dir)
      const json = fs.existsSync(storePath)
        ? loadJson(storePath)
        : {}
      json[key] = value
      saveJson(storePath, json)
      return value
    }
  }
}

module.exports = {
  createJsonStorage,
}
