const fs = require('fs')
const filePath = './db.json'
require('dotenv').config()

function store(db) {
  fs.writeFile(filePath, JSON.stringify(db), (err) => {
    if (err) console.error(err)
  })
}

function logger(func, msg) {
  if (process.env.LOGGING !== true) return

  const now = new Date()
  const date = now.toLocaleDateString('sv-SE')
  const time = now.toLocaleTimeString('sv-SE')

  const log = `
    ${func}(): ${msg}. ${date} - ${time}
  `

  console.log(log)
}

module.exports = { store, logger }