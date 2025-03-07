import dotenv from "dotenv"
import { app } from "./app.js";
import connectDB from "./db/index.js";

// configure dotenv
dotenv.config({
    path: "./.env"
})

const PORT = process.env.PORT || 8001;

// connecting the DB
connectDB()
.then(() => {
    // start the server on specific port
    app.listen(PORT, () => {
        console.log(`The server is running on ${PORT}`)
    })
})
.catch(err => console.log(err));
