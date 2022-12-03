require('dotenv').config()
const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000
const cors = require('cors')

app.use(express.json())
app.use(cors())



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