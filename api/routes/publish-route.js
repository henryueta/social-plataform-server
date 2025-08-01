const express = require('express')
const jsonwebtoken = require('jsonwebtoken')
const {supabase} = require('../config/database.js')
const {upload} = require('../../middlewares/multer.js')
const {Jimp}  = require('jimp')
const { readToken } = require('../../functions/token.js')
const { onQueryDataList } = require('../../functions/listLimit.js')

const publish_router = express.Router()

publish_router.get("/publish/get/group",async(req,res)=>{
    const user_auth = readToken(req.cookies['auth_token'])
    try {
        if(!user_auth){
            return res.status(401).send({message:"Usuário não autenticado",status:401})
        }
        const {type,username,limit,page} = req.query
        let post_data = null;
        let like_data = null;

        const limit_number = parseInt(limit)

        const page_number = parseInt(page)

        switch (type) {

            case "search":
                const {search} = req.query
                console.log("search",search)
                post_data = await onQueryDataList(limit_number,page_number,{
                    name:"vw_table_post",
                    fieldCount:"username",
                    fieldSelect:`
                    user_small_photo,
                    username,
                    namertag,
                    creation_date_interval,
                    creation_date,
                    description,
                    image,
                    like_qnt,
                    commentary_qnt,
                    post_id
                    `
                },[{
                    column:"description",
                    operator:"ilike",
                    value:search+"%"
                }])

                break;

            case "all":

                post_data = await onQueryDataList(limit_number,page_number,{
                    name:'vw_table_post',
                    fieldCount:"username",
                    fieldSelect:`
                    user_small_photo,
                    username,
                    namertag,
                    creation_date_interval,
                    creation_date,
                    description,
                    image,
                    like_qnt,
                    commentary_qnt,
                    post_id
                    `
                })


                break;
            case "following":
                
                post_data = await (async()=>{

                    const following_data = await supabase.from("vw_table_following")
                    .select("following_id")
                    .eq("user_id",user_auth.id)

                    return !following_data.error
                    &&
                    await onQueryDataList(
                    limit_number,
                    page_number,
                    {
                        name:"vw_table_post",
                        fieldSelect:`
                        user_small_photo,
                        username,
                        namertag,
                        creation_date_interval,
                        description,
                        image,
                        like_qnt,
                        commentary_qnt,
                        post_id`
                    },
                    [{column:"user_id",operator:"in",value:following_data.data.map((following)=>
                        following.following_id    
                    )}]
                )

                })()

          

                break;
            case "especific":
                post_data  = await onQueryDataList(
                limit_number,
                page_number,
                {
                    name:"vw_table_post",
                    fieldSelect:`
                    user_small_photo,
                    username,
                    namertag,
                    creation_date_interval,
                    description,
                    image,
                    like_qnt,
                    commentary_qnt,
                    post_id
                    `
                },[{column:"username",operator:"eq",value:username}])
     
                
                break;
            default:
                break;
        }

        like_data = await supabase.from("tb_post_like")
        .select("fk_id_post",{count:'exact'})
        .eq("fk_id_user",user_auth.id)
        .in("fk_id_post",post_data.data.map((post)=>post.post_id))

        !post_data.error
        &&
        !like_data.error
        ? (()=>{


            return res.status(200).send({message:"Postagens listados com sucesso",status:200,
        data:{
            post_list:post_data.data,
            liked_posts:like_data.data.map((id)=>id.fk_id_post),
            post_list_count_remaining:post_data.remaining,
            isStart:!!(page_number === 1)
        }})
        })()
        : 
        post_data.error
        ? res.status(500).send({message:post_data.error,status:500})
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
        namertag,
        creation_date_interval,
        description,
        image,
        like_qnt,
        commentary_qnt,
        post_id,
        user_id
        `)
        .eq("post_id",id);

        const post_like_data = await supabase.from("tb_post_like")
        .select("fk_id_post")
        .eq("fk_id_user",user_auth.id)
        .eq('fk_id_post',id);

        const post_same_user_check = (()=>{
            return !post_data.error
            ? !!(post_data.data[0].user_id === user_auth.id)
            : res.status(500).send({message:post_data.error,status:500})
        })()

        !post_data.error
        &&
        !post_like_data.error
        ?
        res.status(200).send({message:"Postagem listado com sucesso",status:200,data:{
            post:post_data.data[0],
            liked_post:!!post_like_data.data.length,
            isSameUser:post_same_user_check
        }})
        :
        res.status(500).send({message:"Erro interno no Servidor",status:500})

    } catch (error) {
        console.log(error)
        res.status(500).send({message:error,status:500})
    }
})

publish_router.post("/publish/post",upload.single("image"),async(req,res)=>{


    const user_auth = readToken(req.cookies['auth_token'])
    try {
        if(!user_auth){
            return res.status(401).send({message:"Usuário não autenticado",status:401})
        }         
        let current_image_value = "";
        
        if(!!req.file){
            const buffer = req.file.buffer;
            const jimpImage = await Jimp.read(buffer)

            const outputBuffer = await jimpImage.getBuffer("image/jpeg",{
                quality:80
            })
            const currentFileName = "post"+Date.now();

            const image_upload = await supabase.storage
            .from('social-plataform-storage/post/')
            .upload(currentFileName,outputBuffer,{
                contentType:"image/webp",
                upsert:false
            })

            const image_path = supabase.storage
            .from("social-plataform-storage")
            .getPublicUrl("/post/"+currentFileName)
            
            current_image_value = image_path.data.publicUrl

            !!image_upload.error
            && res.status(500).send({message:image_upload.error,status:500})

        } 


        const {description} = req.body

        const insert_post = await (async()=>{

            return await supabase.from("tb_post")
            .insert({
                description:description,
                fk_id_user:user_auth.id,
                image:current_image_value
            })

        })()

        !insert_post.error
        ? (async ()=>{

            const user_data = await supabase.from("tb_user")
            .select("post_qnt")
            .eq('id',user_auth.id)

            const update_user_data = await supabase.from("tb_user")
            .update({
                post_qnt:await user_data.data[0].post_qnt+1
            })
            .eq("id",user_auth.id)


            return !update_user_data.error
            &&
            res.status(201).send({message:"Postagem criada com sucesso",status:201})
        })()
        : (()=>{

           return res.status(500).send({message:insert_post.error,status:500})

        })()


    } catch (error) {
        console.log(error)
        res.status(500).send({message:error,status:500})
    }

})

//'social_status' | 'structure'

publish_router.put("/publish/delete",upload.none(),async (req,res)=>{
    const user_auth = readToken(req.cookies['auth_token'])
    try {
        if(!user_auth){
            return res.status(401).send({message:"Usuário não autenticado",status:401})
        }

        const {post_id} = req.query;

        const post_delete = await supabase.from("tb_post")
        .update({
            is_deleted:true
        })
        .eq("id",post_id)
        .select("id");

        const user_data = await supabase.from("tb_user")
        .select("post_qnt")
        .eq("id",user_auth.id)

        !post_delete.error
        &&
        !!user_data.data.length
        ? (async()=>{

            await supabase.from("tb_user")
            .update({
                post_qnt:(user_data.data[0].post_qnt-1)
            })
            .eq("id",user_auth.id)

            res.status(201).send({message:"Postagem marcada como excluida com sucesso",status:201})
        })()
        : res.status(500).send({message:post_delete.error,status:500});

    } 
    catch(error){
        console.log(error)
        res.status(500).send({message:error,status:500})
    }


})

publish_router.put("/publish/put/structure",upload.none(),async (req,res)=>{

    const user_auth = readToken(req.cookies['auth_token'])
    try {
        if(!user_auth){
            return res.status(401).send({message:"Usuário não autenticado",status:401})
        } 
        const {post_id} = req.query
        const {description} = req.body


        const post_put = await supabase.from("tb_post")
        .update({description:description})
        .eq("id",post_id)
        .select("description")

        !post_put.error
        ? res.status(200).send({message:"Postagem atualizada com sucesso",status:201,
            data:post_put.data[0]
        })
        : res.status(500).send({message:post_put.error,status:500})
        

    } catch (error) {
        console.log(error)
        res.status(500).send({message:error,status:500})
    }

})

publish_router.put("/publish/put/social_status",async (req,res)=>{
    const user_auth = readToken(req.cookies['auth_token'])
    try {
        if(!user_auth){
            return res.status(401).send({message:"Usuário não autenticado",status:401})
        } 
        const {type,post_id} = req.query

        let post_action_data = null;//table_action_data
        let post_action_verify = null;//table_action_verify post-comme
        let current_post_data = null;//current_table_data post-comme
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