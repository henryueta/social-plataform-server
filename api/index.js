const express = require('express')
const cors = require("cors")
const {user_router}  = require("./routes/user-route.js")
const cookieParser = require('cookie-parser')
const {auth_router} = require('./routes/auth-route.js')
const {publish_router} = require('./routes/publish-route.js')
const {like_router} = require('./routes/like-route.js')
const {commentary_router} = require('./routes/commentary-route.js')

const server = express();

server.use(cors({
    credentials:true, 
    origin:"http://localhost:5173"
}))
server.use(express.json())
server.use(cookieParser())
server.use(user_router)
server.use(auth_router)
server.use(publish_router)
server.use(like_router)
server.use(commentary_router)

server.get("/",(req,res)=>{

    try{

        res.status(200).send({message:"Welcome to my Server!"})

    }
    catch(error){
        console.log(error)
        res.status(500).send(error)
    }

})


server.listen(3750,(error)=>{
    if(error){
        console.log(error)
        throw new Error(error)
    }
    console.log("server-online")
})
