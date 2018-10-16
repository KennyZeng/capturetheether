require('dotenv-safe').config()
const { createWeb3 } = require('./web3')
global.web3 = createWeb3()
