const express = require('express')
const jsonwebtoken = require('jsonwebtoken')
const {supabase} = require('../config/database.js')
const {upload} = require('../../middlewares/multer.js')
const {Jimp}  = require('jimp')

const publish_router = express.Router()

publish_router.get("/publish/get/all",async(req,res)=>{
    const auth_token = req.cookies['auth_token'];
    try {
        if(!auth_token){
            return res.status(401).send({message:"Usuário não autenticado",status:401})
        }

        const post_data = await supabase
        .from("tb_post")
        .select("*");

        res.status(200).send({message:"Postagens listadas",status:200,data})

    } catch (error) {
        console.log(error)
        res.status(500).send({message:error,status:500})
    }

})

publish_router.post("/publish/post",upload.single('image'),async(req,res)=>{
        const auth_token = req.cookies['auth_token'];

        const buffer = req.file.buffer;
        const jimpImage = await Jimp.read(buffer)
        
        jimpImage.resize({
            h:300,
            w:600
        });

        const outputBuffer = await jimpImage.getBuffer("image/jpeg",{
            quality:60
        })


        const {data,error} = await supabase.storage
        .from('social-plataform-storage/post/')
        .upload("teste"+Date.now(),outputBuffer,{
            contentType:"image/webp",
            upsert:false
        })

        !!data
        ? console.log(data)
        : console.log(error)

    try {
        if(!auth_token){
                    return res.status(401).send({message:"Usuário não autenticado",status:401})
        }
        const decoded_token = jsonwebtoken.verify(auth_token.token,'shhhhh');


    } catch (error) {
        console.log(error)
        res.status(500).send({message:error,status:500})
    }

})

module.exports = {publish_router}