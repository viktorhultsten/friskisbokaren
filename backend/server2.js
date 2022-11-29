const db = require('./db')
const fs = require('fs')
const friskis = require('./friskis')
const { startOfWeek, format, add } = require('date-fns')
require('dotenv').config()

const users = JSON.parse(process.env.USERS)
console.log(users)

function updateDB(newDB) {
  fs.writeFile('./db.json', JSON.stringify(newDB), (err) => {
    if (err) {
      console.error(err)
    }
  })
}

function addUser(user) {
  if (!user.name) return false

  const newUser = {
    name: user.name,
    wishes: [],
    bookings: []
  }

  db.users.push(newUser)
  updateDB(db)

  return true
}

function addWish(username, wish) {
  if (!username || username == '') return false
  if (!wish.name || !wish.weekday || !wish.start_time || !wish.place) return false

  // TODO: Check if wish already exists

  const currentUser = db.users.find((user) => user.name.toLowerCase() == username.toLowerCase())
  currentUser.wishes.push(wish)
  updateDB(db)

  return true
}

function removeWish(user, wish) {
  // TODO: Complete function
  return
}

async function dailyCheck() {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekdays = [...new Set(db.users.map((user) => 
    user.wishes.map((wish) => wish.weekday)
  ).flat())]

  const dates = weekdays.map((weekday) => add(monday, { days: weekday}))

  let schedule = []
  for (let i = 0; i < dates.length; i++) {
    const res = await friskis.hämtaPass(dates[i])
    schedule.push(res)
  }

  list = schedule.flat()

  db.users.forEach((user) => {
    user.wishes.forEach((wish) => {
      const todo = list.filter((l) => (
        l.name.toLowerCase() == wish.name.toLowerCase() &&
        l.place.toLowerCase() == wish.place.toLowerCase()
      ))
      .filter((l) => {
        const startTime = [
          new Date(l.duration.start).getHours(),
          new Date(l.duration.start).getMinutes()
        ]

        return (
          startTime[0] == wish.start_time[0] &&
          startTime[1] == wish.start_time[1]
        )
      })
      .map((l) => ({
        id: l.id,
        user: user.name,
        bookableEarliest: l.bookableEarliest
      }))

      db.todo = todo
      updateDB(db)
    })
  })
}

dailyCheck()