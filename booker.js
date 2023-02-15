// if (process.env.NODE_ENV !== 'production') require('dotenv').config()
const db = require('./db')
const fs = require('fs')
const friskis = require('./friskis')
const { startOfWeek, add } = require('date-fns')
const cron = require('node-cron')
const { store, logger } = require('./utils')

const USER_CREDENTIALS = JSON.parse(process.env.USERS)

// TODO: crontab updateAllBookings()
cron.schedule('4 5 * * *', updateAllBookings)

// TODO: crontab makeAllBookings()
cron.schedule('*/15 * * * *', makeAllBookings)

async function getWorkouts() {
  let tomorrow = new Date()
  tomorrow.setHours(0, 0, 0)
  tomorrow = add(tomorrow, { days: 1 })

  const workouts = []
  for (let i = 0; i < 7; i++) {
    const day = add(tomorrow, { days: i })
    const workoutsOfDay = await friskis.hämtaPass(day)
    workouts.push(...workoutsOfDay)
  }

  return workouts
}

function compareWishAndWorkout(wish, workout) {
  const workoutDate = new Date(workout.duration.start)
  const monday = startOfWeek(workoutDate, { weekStartsOn: 1 })
  const wishDate = add(monday, { days: wish.weekday })
  wishDate.setHours(wish.start_time[0], wish.start_time[1], 0)

  return (
    wish.name.toLowerCase() == workout.name.toLowerCase() &&
    wish.place.toLowerCase() == workout.place.toLowerCase() &&
    workoutDate.getTime() == wishDate.getTime()
  )
}

function alreadyBookedBefore(USER, workout) {
  const existsBooking = db.booked.filter((booking) => (
    booking.user == USER.name &&
    booking.id == workout.id
  )).length === 1

  return existsBooking
}

async function updateUserBookings(USER, workouts) {
  const { login, credentials, msg } = await friskis.loginUser(USER.email, USER.password)
  if (!login) {
    logger('updateUserBookings', msg)
    return
  }

  const { foundBookings, bookings, errorMsg } = await friskis.getBookings(credentials.userId, credentials.token)

  if (!foundBookings) {
    logger('updateUserBookings', errorMsg)
    return
  }

  if (bookings.length >= 5) {
    logger('updateUserBookings', `User '${USER.name}' already has five active bookings`)
    return
  }

  const wishes = db.users.find((user) => user.name == USER.name).wishes
  wishes.forEach((wish) => {
    const todo = workouts
      .filter((workout) => compareWishAndWorkout(wish, workout))
      .filter((workout) => false === alreadyBookedBefore(USER, workout))
      .filter((workout) => false === bookings.includes(workout.id))
      .map((workout) => ({
        id: workout.id,
        user: USER.name,
        bookableEarliest: workout.bookableEarliest,
        date: workout.duration.start
      }))

    if (todo.length == 1) {
      db.todo.push(todo[0])
      logger('updateUserBookings', `Added ${todo[0].id} to ${USER.name}`)
    }
  })
  store(db)
}

function cleanBooked() {
  const now = new Date()
  db.booked = db.booked.filter((booking) => now < new Date(booking.date))
  store(db)
}

async function updateAllBookings() {
  logger('updateAllBookings', 'Started')
  const workouts = await getWorkouts()
  db.todo = []
  store(db)

  USER_CREDENTIALS.forEach((USER) => {
    updateUserBookings(USER, workouts)
  })

  cleanBooked()

  logger('updateAllBookings', 'Completed')
}

async function makeAllBookings() {
  logger('makeAllBookings', 'Started')
  const now = new Date()
  const bookableTodos = db.todo.filter((todo) => now > new Date(todo.bookableEarliest))
  if (bookableTodos.length == 0) {
    logger('makeAllBookings', `Completed. No bookings to do`)
    return
  }

  const users = [...new Set(bookableTodos.map((todo) => todo.user))].map((username) => ({
    name: username,
    userId: '',
    token: ''
  }))

  for (let i = 0; i < users.length; i++) {
    const storedCredentials = USER_CREDENTIALS.find((user) => user.name == users[i].name)
    const { login, credentials, msg } = await friskis.loginUser(storedCredentials.email, storedCredentials.password)
    if (!login) {
      logger('makeAllBookings', msg)
      continue
    }

    users[i].userId = credentials.userId
    users[i].token = credentials.token
  }

  for (let i = 0; i < bookableTodos.length; i++) {
    const user = users.find((user) => user.name == bookableTodos[i].user)
    if (!user.userId) continue

    const { isBooked, bookingMsg } = await friskis.book(bookableTodos[i], user)
    logger('makeAllBookings', bookingMsg)

    if (isBooked) {
      db.todo = db.todo.filter((todo) => todo.id !== bookableTodos[i].id)
      db.booked.push(bookableTodos[i])
    }
  }

  store(db)
  logger('makeAllBookings', `Completed. ${bookableTodos.length} bookings done`)
}
