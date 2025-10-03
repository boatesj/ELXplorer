const express = require("express");
const app = express();
const dotenv = require("dotenv");
const cron = require("node-cron");
const mongoose = require("mongoose");
const { sendWelcomeMail } = require("./EmailService/WelcomeEmail")
dotenv.config();


// DB CONNECTION
const DB=process.env.DB;
mongoose.connect(DB).then(()=>{
    console.log("DB connection is successful")
}).catch((e) => {
    console.log(e);
})

// TASK SCHEDULER
const run =() => {
    cron.schedule('* * * * *', () => {
        sendWelcomeMail();   
 });
};

run();


// SERVER
const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Backgroundservices is running on port ${PORT}`)
})