const fs = require('fs')
const friskis = require('./friskis')

// Fetches pass for today and next seven days and writes to json file
async function getR8dates(date) {
  const allPass = []
  for (let i = 0; i <= 7; i++) {
    let day = new Date()
    day.setDate(date.getDate() + i)
    const pass = await friskis.hämtaPass(day)
    allPass.push(pass)
  }

  fs.writeFile('./data/test.json', JSON.stringify(allPass.flat()), (err) => {
    if (err) {
      console.error(err)
    }
  })  
}

// const data = fs.readFileSync('./data/test.json')
// const pass = JSON.parse(data)
// const boy = findPassByName(pass, 'cirkelfys')
// console.log(boy)
// findPassByNameAndDate(pass, 'cirkelfys', new Date())

function findPassByName(pass, name) {
  const nameLower = name.toLowerCase()
  return pass.filter((p) => {
    const pName = p.name.toLowerCase()

    return (
      pName == nameLower ||
      pName.indexOf(nameLower) != -1
    )
  })
}

function findPassByNameAndDate(pass, name, date) {
  const nameLower = name.toLowerCase()
  const shortDate = date.toISOString('sv-SE')

  console.log(shortDate)
}