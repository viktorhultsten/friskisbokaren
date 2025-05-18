const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { add } = require('date-fns')

const avdelningar = [6184, 6186, 6185, 6188, 6187]

function hämtaPass(date) {
    const datum_start = date.toISOString()
    const datum_slut = add(date, { days: 1 }).toISOString()

    const fetches = avdelningar.map((avdelning) =>
        new Promise(async (resolve, reject) => {
            const url = `https://friskissvettis.brpsystems.com/brponline/api/ver3/businessunits/${avdelning}/groupactivities?period.start=${datum_start}&period.end=${datum_slut}`
            fetch(url)
                .then((api) => api.json())
                .then((result) => resolve(result))
        }
        ))

    return Promise
        .allSettled(fetches)
        .then((promises) => promises
            .map((p) => p.value)
            .flat()
            .map((p) => ({
                id: p.id,
                name: p.name.trim(),
                duration: p.duration,
                place: (p.businessUnit.name.indexOf('Uppsala - ') !== -1) ? p.businessUnit.name.split(' - ')[1] : p.businessUnit.name,
                bookableEarliest: p.bookableEarliest,
                slotsLeft: p.slots.leftToBook
            }))
        )
}

async function getBookings(userId, token) {
    const url = 'https://friskissvettis.brpsystems.com/brponline/api/ver3/customers/' + userId + '/bookings/groupactivities'

    try {
        const api = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            },
        })

        if (api.status == 200) {
            const result = await api.json()
            const bookings = result.map((booking) => booking.groupActivity.id)
            return { foundBookings: true, bookings }
        }
    } catch (err) {
        return { foundBookings: false, bookings: null, errorMsg: 'Could not get bookings from user ' + user }
    }
}

async function loginUser(email, password) {
    if (!email || !password) {
        return { login: false, msg: 'Email or password not found' }
    }

    const url = 'https://friskissvettis.brpsystems.com/brponline/api/ver3/auth/login'

    try {
        const login = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: email,
                password: password
            })
        })
        const response = await login.json()

        return {
            login: true,
            credentials: {
                userId: response.username,
                token: response.access_token
            }
        }
    } catch (err) {
        return {
            login: false,
            msg: 'Something went wrong with the HTTP request'
        }
    }
}

async function book(todo, user) {
    const url = 'https://friskissvettis.brpsystems.com/brponline/api/ver3/customers/' + user.userId + '/bookings/groupactivities'

    try {
        const booking = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + user.token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                allowWaitingList: false,
                groupActivity: todo.id
            })
        })
        if (booking.status == 403) {
            return { isBooked: true, bookingMsg: 'Already full. Workout skipped' }
        } else if (booking.status == 201) {
            return { isBooked: true, bookingMsg: 'Booking successful' }
        } else {
            return { isBooked: false, bookingMsg: 'The response code was not expected: ' + booking.status }
        }
    } catch (err) {
        return { isBooked: false, bookingMsg: 'Something went wrong with the HTTP request' }
    }
}

module.exports = { hämtaPass, loginUser, book, getBookings }
