const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { add } = require('date-fns')

const avdelningar = [6184, 6186, 6185, 6188, 6187]

function hämtaPass(date) {
    const datum_start = date.toISOString()
    const datum_slut = add(date, { days: 1 })

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
            return result.map((booking) => booking.groupActivity.id)
        }
    } catch (err) {
        console.log('Could not get bookings from user ', user)
        console.error(err)
        return
    }
}

async function loginUser(email, password) {
    console.log('loginUser: trying to login')
    if (!email || !password) {
        console.log('loginUser: user.username or user.password not found')
        return false
    }

    const url = 'https://friskissvettis.brpsystems.com/brponline/api/ver3/auth/login'

    try {
        const login = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({
                username: email,
                password: password
            })
        })
        const response = await login.json()

        return {
            userId: response.username,
            token: response.access_token
        }
    } catch (err) {
        console.log('loginUser: ERROR:' + err)
        return false
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
            console.log('Probably fully boooked', booking)
            return true
        } else if (booking.status == 201) {
            return true
        } else {
            console.log('ERROR book():', booking)
            return false
        }
    } catch (err) {
        console.log('ERROR book():', err)
        return false
    }
}

module.exports = { hämtaPass, loginUser, book, getBookings }
