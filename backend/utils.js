const fs = require('fs')
const filePath = './db.json'

function store(db) {
  fs.writeFile(filePath, JSON.stringify(db), (err) => {
    if (err) console.error(err)
  })
}

module.exports = { store }