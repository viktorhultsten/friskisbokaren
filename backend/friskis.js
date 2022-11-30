const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { addDays } = require('./utils')
const dev = require('./data/test')

const avdelningar = [6184, 6186, 6185, 6188, 6187]

function hämtaPass(date) {
    const datum_start = date.toISOString()
    const datum_slut = addDays(date, 1).toISOString()

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

async function loginUser(user) {
    if (!user.email || !user.password) return false

    const url = 'https://friskissvettis.brpsystems.com/brponline/api/ver3/auth/login'

    try {
        const login = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({
                username: user.email,
                password: user.password
            })
        })
        const response = await login.json()
        
        return {
            username: response.username,
            token: response.access_token
        }
    } catch (err) {
        return false
    }
}

async function book(todo, user) {
    const url = 'https://friskissvettis.brpsystems.com/brponline/api/ver3/customers/' + user.username + '/bookings/groupactivities'

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
        if (booking.status != 201) {
            console.log('ERROR book():', booking)
            return false
        }

        const response = await booking.json()
        return response

    } catch (err) {
        console.log('ERROR book():', err)
        return false
    }
}

module.exports = { hämtaPass, loginUser, book }