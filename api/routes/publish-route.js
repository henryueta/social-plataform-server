const express = require('express')
const jsonwebtoken = require('jsonwebtoken')
const {supabase} = require('../config/database.js')
const {upload} = require('../../middlewares/multer.js')
const {Jimp}  = require('jimp')
const { readToken } = require('../../functions/token.js')

const publish_router = express.Router()

publish_router.get("/publish/get/group",async(req,res)=>{
    const user_auth = readToken(req.cookies['auth_token'])
    try {
        if(!user_auth){
            return res.status(401).send({message:"Usuário não autenticado",status:401})
        }
        const {type,username,limit} = req.query
        let post_data = null;
        let like_data = null;
        let post_count = null;
        console.log("limite:",limit)
        switch (type) {
            case "all":
                post_count = await supabase.from('vw_table_post')
                .select("username",{
                    count:'exact'
                })
                post_data = await supabase.from("vw_table_post")
                .select(`
                    user_small_photo,
                    username,
                    creation_date_interval,
                    creation_date,
                    description,
                    like_qnt,
                    commentary_qnt,
                    post_id
                    `)
                    .limit(limit);
                like_data = await supabase.from("tb_post_like")
                .select("fk_id_post")
                .eq("fk_id_user",user_auth.id)
                .limit(limit);
                break;
            case "especific":
                post_count = await supabase.from('vw_table_post')
                .select("username",{
                    count:'exact'
                })
                .eq("username",username)

                post_data = await supabase.from("vw_table_post")
                .select(`
                    user_small_photo,
                    username,
                    creation_date_interval,
                    description,
                    like_qnt,
                    commentary_qnt,
                    post_id
                    `)
                .eq("username",username)
                .limit(limit);

                like_data = await supabase.from("tb_post_like")
                .select("fk_id_post")
                .eq("fk_id_user",user_auth.id)
                .limit(limit);
                break;
            default:
                break;
        }


        !post_data.error
        &&
        !like_data.error
        &&
        !post_count.error
        ? (()=>{
            return res.status(200).send({message:"Postagens listados com sucesso",status:200,
        data:{
            post_list:post_data.data,
            liked_posts:like_data.data.map((id)=>id.fk_id_post),
            post_list_count_remaining:(post_count.count-limit)
        }})
        })()
        : 
        post_data.error
        ? res.status(500).send({message:post_data.error,status:500})
        :
        post_count.error
        ? res.status(500).send({message:post_count.error,status:500})
        : 
        like_data.error
        &&
        res.status(500).send({message:like_data.error,status:500})
        
        

    } catch (error) {
        console.log(error)
        res.status(500).send({message:error,status:500})
    }

})

publish_router.get("/publish/get/single",async(req,res)=>{
    const user_auth = readToken(req.cookies['auth_token'])
    try {
        if(!user_auth){
            return res.status(401).send({message:"Usuário não autenticado",status:401})
        } 
        const {id} = req.query

        const post_data = await supabase.from("vw_table_post")      
        .select(`
        user_small_photo,
        username,
        creation_date_interval,
        description,
        like_qnt,
        commentary_qnt,
        post_id
        `)
        .eq("post_id",id);

        const post_like_data = await supabase.from("tb_post_like")
        .select("fk_id_post")
        .eq("fk_id_user",user_auth.id)
        .eq('fk_id_post',id);

        !post_data.error
        &&
        !post_like_data.error
        ?
        res.status(200).send({message:"Postagem listado com sucesso",status:200,data:{
            post:post_data.data[0],
            liked_post:!!post_like_data.data.length,
        }})
        :
        res.status(500).send({message:"Erro interno no Servidor",status:500})

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

//'social_status' | 'structure'

publish_router.put("/publish/put/social_status",async (req,res)=>{
    const user_auth = readToken(req.cookies['auth_token'])
    console.log("REQ")
    try {
        if(!user_auth){
            return res.status(401).send({message:"Usuário não autenticado",status:401})
        } 
        const {type,post_id} = req.query

        let post_action_data = null;//table_action_data
        let post_action_verify = null;//table_action_verify post-comme
        let current_post_data = null;//current_table_data post-comme
        let post_change_data = null;//table_change_data post-comme
        let formated_data = null

        current_post_data = await supabase.from("tb_post")//post-comme
        .select("like_qnt,commentary_qnt")
        .eq("id",post_id);

        !!current_post_data.data
        &&
        (async()=>{
            switch (type) {
            case 'like':

                post_action_verify = await supabase.from("tb_post_like")//post_like-commen_like
                .select("id")
                .eq("fk_id_user",user_auth.id)
                .eq("fk_id_post",post_id)

                formated_data = !post_action_verify.data.length
                ? (async()=>{

                    post_action_data = await supabase.from('tb_post_like')//post_like-commen_like
                    .insert({
                        fk_id_user:user_auth.id,
                        fk_id_post:post_id
                    });
                    post_change_data = await supabase.from("tb_post")//post-commen
                    .update({
                        like_qnt:current_post_data.data[0].like_qnt+=1
                    })
                    .eq('id',post_id)  
                    
                    return (!post_action_data.error
                    &&
                    !post_action_verify.error)
                    && 
                    {
                        like_qnt:(current_post_data.data[0].like_qnt),
                        isLiked:true
                    }

                })()
                : (async()=>{

                    post_action_data = await supabase.from("tb_post_like")
                    .delete()
                    .eq("id",post_action_verify.data[0].id)

                    post_change_data = await supabase.from("tb_post")
                    .update({
                        like_qnt:current_post_data.data[0].like_qnt-=1
                    })  
                    .eq('id',post_id)  

                    return (!post_action_data.error
                    &&
                    !post_action_verify.error)
                    && 
                    {
                        like_qnt:(current_post_data.data[0].like_qnt),
                        isLiked:false
                    }

                })()
                


                break;
            case 'commentary':
                const {commentary} = req.body
                break;
            default:
                break;
            }
            
            !!(await formated_data)
        ? res.status(200).send({message:"Status social da postagem atualizada com sucesso",status:200,
            data:await formated_data})
        : res.status(500).send({message:"Erro interno no Servidor",status:500})

        })()

        

    } catch (error) {
        console.log(error)
        res.status(500).send({message:error,status:500})
    }
})

module.exports = {publish_router}