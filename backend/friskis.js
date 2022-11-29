const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { addDays } = require('./utils')
const dev = require('./data/test')

const avdelningar = [6184, 6186, 6185, 6188, 6187]

function hämtaPass(date) {
    const datum_start = date.toISOString()
    const datum_slut = addDays(date, 1).toISOString()

    return dev // TODO: dev data. Remove in prod

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

module.exports = { hämtaPass }