const express = require('express')
const app = express()
const cors = require('cors')
const cron = require('node-cron')
const env = require('dotenv').config()
const userRoute = require('./router/userRoute')
const adminRoute = require('./router/adminRoute')
const connectDB = require('./config/db')
const authRoute = require('./router/authRoute')
const publicRoute = require('./router/publicRoute')
const cancelPendingOrders = require('./utils/CancelOrderExceedsTwoDaysWithoutPayments')
const webhookRoute = require('./router/webhookRoute')
connectDB()
const sampleController = require('./controllers/user/sampleController')


const allowedOrigins = ['http://localhost:5173', 'https://oceanoflaptops.store']

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true)
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = `The CORS policy for this site does not allow access from the specified Origin.`
        return callback(new Error(msg), false)
      }
      return callback(null, true)
    },
    credentials: true,
  })
)

const cookieParser = require('cookie-parser')
app.use(cookieParser())


app.use('/api/webhook', webhookRoute)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const expireReservations = require('./utils/expireReservations')


cron.schedule('0 0 * * *', () => {
  console.log('Running scheduled job: Cancelling pending orders')
  cancelPendingOrders()
})


cron.schedule('*/5 * * * *', () => {
  expireReservations()
})

app.use('/api/', userRoute)
app.use('/api/admin', adminRoute)
app.use('/api/auth', authRoute)
app.use('/api/public', publicRoute)

const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server started on port number ${PORT}`);
})
