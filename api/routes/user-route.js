const express = require('express')
const jsonwebtoken = require('jsonwebtoken')
const {supabase} = require('../config/database.js')
const {upload} = require('../../middlewares/multer.js')
const {readToken} = require("../../functions/token.js")
const {Jimp}  = require('jimp')

const user_router = express.Router()

user_router.get("/user/get/group",async (req,res)=>{
        const user_auth = readToken(req.cookies['auth_token'])

    try {
        const {type} = req.query
        let user_list_data = null;
        console.log(user_auth)
        if(!user_auth.validated){
            return res.status(401).send({message:"Usuário não autenticado",status:401})
        }

        switch (type) {
            case "following":
                user_list_data = await supabase
                .from("vw_table_following")
                .select("username:following_username,image:following_photo")
                .eq("user_id",user_auth.id);
                break;
            default:
                break;
        }
        !!user_list_data.data
        ? res.status(200).send({message:"Usuários listados com sucesso",status:200,data:user_list_data.data})
        : res.status(500).send({message:user_list_data.error,status:500})

    } catch (error) {
        res.status(500).send({message:error,status:500})
        console.log(error)
    }
})

user_router.get("/user/get/single",async (req,res)=>{
        const user_auth = readToken(req.cookies['auth_token'])
    try {
        
        const {type} = req.query
        let user_data = null;
        console.log(user_auth)
        if(!user_auth.validated){
            return res.status(401).send({message:"Usuário não autenticado",status:401})
        }

        switch (type) {
            case "small":
                user_data = await supabase
                .from("tb_user")
                .select("username,image:small_profile_photo")
                .eq("id",user_auth.id)
            break;
            case "social":
                user_data = await supabase
                .from("tb_user")
                .select("username,image:small_profile_photo,followers_qnt,following_qnt,post_qnt")
                .eq("id",user_auth.id)
            break;
            case "important":
                user_data = await supabase
                .from("tb_user")
                .select("username,email")
                .eq("id",user_auth.id)
            break;
            default:
            break;
        }

        !!user_data.data
        ? res.status(200).send({message:"Usuário listado com sucesso",status:200,data:user_data.data[0]})
        : res.status(500).send({message:user_data.error,status:500})
        

    } catch (error) {
        res.status(500).send({message:error,status:500})
        console.log(error)
    }

})

user_router.get("/user",(req,res)=>{

    try{
        res.status(200).send({message:"usuarios listados"})
    }
    catch(error){
        console.log(error)
        res.status(500).send({message:error,status:500})
    }

})


user_router.put("/user/update",upload.single('image'),async(req,res)=>{
        const auth_token = req.cookies['auth_token'];
        
    try {
        
        if(!auth_token){
            return res.status(401).send({message:"Usuário não autenticado",status:401})
        }
        const decoded_token = jsonwebtoken.verify(auth_token.token,'shhhhh');

        const {username,email} = req.body
        const buffer = req.file.buffer;
        const jimp = await import('jimp');
        const jimpImage = await jimp.read(buffer);
        jimpImage.resize(300,jimp.AUTO);

        const outputBuffer = await jimpImage.getBufferAsync(jimp.MIME_JPEG)


        const {data,error} = await supabase.storage
        .from('class-plataform-storage')
        .upload("teste",outputBuffer,{
            contentType:"image/webp",
            upsert:true
        })

        !!data
        ? console.log(data)
        : console.log(error)

    } catch (error) {
        console.log(error)
        res.status(500).send({message:error,status:500})
    }
})

module.exports = {
    user_router
}
