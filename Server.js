const express = require("express");
const app = express();
const cors = require("cors");
const cron = require("node-cron");
const env = require("dotenv").config();
const userRoute = require("./router/userRoute");
const adminRoute = require("./router/adminRoute");
const connectDB = require("./config/db");
const authRoute = require('./router/authRoute');
const publicRoute = require('./router/publicRoute')
const cancelPendingOrders = require("./utils/CancelOrderExceedsTwoDaysWithoutPayments");

connectDB();
//const sampleController = require('./controllers/user/sampleController')
app.use(
  cors({
    //origin: "http://localhost:5173", 
     origin: "https://oceanoflaptops.shop",
    credentials: true, 
  })
);

const cookieParser = require('cookie-parser');
app.use(cookieParser());


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Run every day at midnight (00:00)
cron.schedule("0 0 * * *", () => {
  console.log("Running scheduled job: Cancelling pending orders");
  cancelPendingOrders();
});


app.use("/api/", userRoute);
app.use("/api/admin", adminRoute);
app.use("/api/auth",authRoute);
app.use("/api/public",publicRoute);

app.listen(3000, () => {
  console.log("Server started on port number 3000");
});
