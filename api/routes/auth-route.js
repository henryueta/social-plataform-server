const express = require('express')
const jsonwebtoken = require('jsonwebtoken')
const {supabase} = require('../config/database.js')
const hash = require('password-hash')
const {upload} = require('../../middlewares/multer.js')

const auth_router = express.Router()


auth_router.get("/auth/checkout",upload.none(),async (req,res)=>{


        const auth_token = req.cookies['auth_token'];

        if(!auth_token){
            return res.status(401).send({message:"Usuário não autenticado",status:401})
        }

    try {
        const decoded_token = jsonwebtoken.verify(auth_token.token,'shhhhh');


        res.status(200).send({message:"auth",status:200})

    } catch (error) {
        console.log(error)
        res.status(500).send({message:error,status:500})
    }

})

auth_router.post("/auth/register",upload.none(),async(req,res)=>{

    try{
        const {email,password,username} = req.body;
        const database_users = await supabase
        .from("tb_user")
        .select("username,email")
        .or("username.eq."+username+",email.eq."+email)

        !!database_users.data.length
        ? (()=>{
            res.status(401).send({message:"Username ou email já estão em uso",status:401})
        })()
        : (async()=>{
            const password_in_hash = hash.generate(password)
            const create_user = await supabase
            .from("tb_user")
            .insert({
                username:username,
                email:email,
                password:password_in_hash
            })
            .select("id")
            
            !!create_user.data
            ?
            res.status(201).send({message:"Usuário cadastrado",status:201})
            : 
            res.status(500).send({message:create_user.error,status:500})
        })()

    }
    catch(error){
        console.log(error)
        res.status(500).send({message:error,status:500})
    }

})



auth_router.post("/auth/login",upload.none(),async (req,res)=>{

    try{
        const {email,password} = req.body;
        
        const database_users = await supabase
        .from("tb_user")
        .select("email,password,id")

        const userLogged = database_users.data.find((user)=>
            !!(user.email === email && hash.verify(password,user.password))
        )
        !!userLogged
        ? (()=>{
            const auth_token = jsonwebtoken.sign({
                user_id:userLogged.id
            },"shhhhh")

            res.cookie(
            "auth_token",
            {
                token:auth_token
            },
            {
                secure:true,
                httpOnly:true,
                sameSite:'none'
            })
            res.status(201).send({message:"auth"})
        })()
        : res.status(401).send({message:"no auth",status:401})
    }
    catch(error){
        console.log(error)
        res.status(500).send({message:error,status:500})
    }

})


module.exports = {auth_router}