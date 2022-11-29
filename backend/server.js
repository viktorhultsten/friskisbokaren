require('dotenv').config()
const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000
const friskis = require('./friskis')
const cors = require('cors')

app.use(express.json())
app.use(cors())


app.get('/pass/:date', async (req, res) => {
    const date = new Date(req.params.date)
    const pass = await friskis.hämtaPass(date)
    const alternatives = [...new Set(pass.map((p) => p.name))]
    return res.json({alternatives, pass})
})

app.use((req, res, next) => {
    const error = new Error('Not found')
    error.statusCode = 404
    return next(error)
})

app.use((error, req, res, next) => {
    if (!error.statusCode) {
        console.log(error)
        return res.status(500).json({ message: 'Server error' })
    } else {
        return res.status(error.statusCode).json({ message: error.message })
    }
})

app.listen(PORT, () => console.log(`Listening on port ${PORT}`))