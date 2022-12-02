const db = require('./db')
const fs = require('fs')
const friskis = require('./friskis')
const { startOfWeek, format, add } = require('date-fns')
const cron = require('node-cron')
require('dotenv').config()

const USER_CREDENTIALS = JSON.parse(process.env.USERS)

// Schedule daily todo-maker
//cron.schedule('4 5 * * *', dailyCheck)

// Schedule booker
//cron.schedule('* * * * *', doBookings)

//dailyCheck()



function updateDB(newDB) {
  fs.writeFile('./db.json', JSON.stringify(newDB), (err) => {
    if (err) {
      console.error(err)
    }
  })
}

async function dailyCheck() {
  console.log('Running: dailyCheck() - ' + new Date())
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
  
  let schedule = []
  for (let i = 0; i < 8; i++) {
    const date = add(monday, { days: i })
    const res = await friskis.hämtaPass(date)
    schedule.push(res)
  }

  list = schedule.flat()

  db.todo = []

  db.users.forEach((user) => {
    user.wishes.forEach((wish) => {
      const todo = list.filter((l) => (
        l.name.toLowerCase() == wish.name.toLowerCase() &&
        l.place.toLowerCase() == wish.place.toLowerCase() &&
        new Date() < new Date(l.duration.start)
      ))
      .filter((l) => {
        const bookDate = new Date(l.duration.start)

        const wishDate = add(monday, { days: wish.weekday })
        wishDate.setHours(wish.start_time[0], wish.start_time[1], 0)

        return (
          bookDate.getTime() == wishDate.getTime() ||
          bookDate.getTime() == (add(wishDate, { days: 7}).getTime())
        )
      })
      .map((l) => ({
        id: l.id,
        user: user.name,
        bookableEarliest: l.bookableEarliest
      }))

      db.todo.push(todo[0])
    })
  })

  updateDB(db)
  console.log('Complete: dailyCheck() - ' + new Date())
}

async function filterBookedBookings(users, todos) {  
  for (let i = 0; i < users.length; i++) {
    const bookings = await friskis.getBookings(users[i])
    users[i].bookings = bookings
  }

  console.log(users)

  filteredTodos = todos.filter((t) => {
    for (let i = 0; i < users.length; i++) {
      if (users[i].bookings.includes(t.id)) return false
    }

    return true
  })

  console.log(filteredTodos)

  return filteredTodos
}

doBookings()

async function doBookings() {
  console.log('Running: doBookings() - ' + new Date())
  const now = new Date()

  let todos = db.todo.filter((todo) => now > new Date(todo.bookableEarliest))
  const users = [...new Set(todos.map((todo) => todo.user))].map((user) => db.users.find((storedUser) => storedUser.name == user))
  
  const tokens = []
  
  console.log('Users: ', users.length)
  
  for (let i = 0; i < users.length; i++) {
    const userCredentials = USER_CREDENTIALS.find((user) => user.name == users[i].name)
    const login = await friskis.loginUser(userCredentials)
    
    if (!login) continue
    
    tokens.push({
      name: users[i].name,
      username: login.username,
      token: login.token
    })
    
    users[i].username = login.username
    users[i].token = login.token
  }
  console.log('Logins complete')
  
  todos = await filterBookedBookings(users, todos)
  console.log('Todos length:', todos.length)


  for (let i = 0; i < todos.length; i++) {
    const user = tokens.filter((t) => t.name == todos[i].user)[0]
    console.log('Todo user found: ' + user?.username)
    if (!user) continue
    
    const booked = await friskis.book(todos[i], user)
    console.log('Booking complete: ' + booked)

    if (!booked) {
      console.log('ERROR while booking:', todos[i], user.name)
    } else {
      db.todo = db.todo.filter((todo) => todo.id !== todos[i].id)
    }
  }

   updateDB(db)
   console.log('Complete: doBookings() - ' + new Date())
}
