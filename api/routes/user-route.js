const express = require('express')
const jsonwebtoken = require('jsonwebtoken')
const {supabase} = require('../config/database.js')
const {upload} = require('../../middlewares/multer.js')
const {readToken} = require("../../functions/token.js")
const {Jimp}  = require('jimp')
const { onQueryDataList } = require('../../functions/listLimit.js')

const user_router = express.Router()


user_router.post("/user/post/follow",upload.none(),async(req,res)=>{
    const user_auth = readToken(req.cookies['auth_token'])

    try {
        if(!user_auth.validated){
            return res.status(401).send({message:"Usuário não autenticado",status:401})
        }   

        const {username} = req.body;

        const user_for_follow_data = await supabase.from("tb_user")
        .select("id,followers_qnt")
        .eq("username",username)    

        !user_for_follow_data.error
        ? (async()=>{

            const check_for_following = await supabase.from("vw_table_following")
        .select("user_following_id",{count:'exact'})
        .eq("user_id",user_auth.id)
        .eq("following_id",user_for_follow_data.data[0].id)
            
            const user_data = await supabase.from("tb_user")
            .select("following_qnt")
            .eq("id",user_auth.id)


            const follow_action = 
            !!(user_data.data)
            &&
            !check_for_following.count
            ? (async()=>{

                const insert_follow = await supabase.from("tb_user_following")
                .insert({
                    fk_id_user:user_auth.id,
                    fk_id_following:user_for_follow_data.data[0].id
                })

                return  {
                 isFollowing:!insert_follow.error,
                 success:!insert_follow.error,
                }    

            })()
            : (async()=>{

                const delete_follow = await supabase.from("tb_user_following")
                .delete()
                .eq("id",check_for_following.data[0].user_following_id)

                return {
                    isFollowing:!!delete_follow.error,
                    success:!delete_follow.error
                }

            })()

            const increment_number = 
            !!(await follow_action).isFollowing
            ? 1
            : -1

            await supabase.from("tb_user")
                .update({
                    followers_qnt:user_for_follow_data.data[0].followers_qnt+increment_number
                })
                .eq("id",user_for_follow_data.data[0].id)
                
            await supabase.from("tb_user")
                .update({
                    following_qnt:user_data.data[0].following_qnt+increment_number
                })
                .eq("id",user_auth.id)

            return !!(await follow_action)
            ? res.status(200).send({
                message:"Relação entre usuários feita com sucesso",
                status:200,
                data:await follow_action
            })
            : res.status(500).send({
                message:"Ops! Um erro inesperado no servidor aconteceu!",
                status:500,
                data:await follow_action
            })
            
        })()

        : res.status(500).send({message:user_for_follow_data.error,status:500})

    }
    catch(error){
        console.log(error)
        res.status(500).send({message:error,status:500})
    }

})


user_router.get("/user/get/group",async (req,res)=>{
        const user_auth = readToken(req.cookies['auth_token'])
        
    try {
        const {type,hasImage,page,limit,username} = req.query

        const limit_number = parseInt(limit)
        const page_number = parseInt(page)

        let user_list_data = null;
        if(!user_auth.validated){
            return res.status(401).send({message:"Usuário não autenticado",status:401})
        }
        const user_identifier = 
                        !!(username)
                        ? username
                        : user_auth.id
                    
                    console.log("identifier",user_identifier)
        switch (type) {
            case "following":
                user_list_data = await onQueryDataList(limit_number,page_number,{
                    name:'vw_table_following',
                    fieldSelect:"username:following_username,namertag:following_namertag"+(!!hasImage&&",image:following_photo")
                },[
                    {column:(
                        username
                        ? "user_username"
                        : 'user_id'
                    ),operator:'eq',value:user_identifier}
                ])
                break;
            case "followers":
                user_list_data = await onQueryDataList(limit_number,page_number,{
                    name:'vw_table_following',
                    fieldSelect:"username:user_username,namertag:user_namertag"+(!!hasImage&&",image:user_photo")
                },[
                    {column:(
                        username
                        ? "following_username"
                        : 'following_id'
                    ),operator:'eq',value:user_identifier}
                ])
                break;
            default:
                break;
        }
        !!user_list_data.data
        ? res.status(200).send({message:"Usuários listados com sucesso",status:200,data:{
            user_list_data:user_list_data.data,
            user_list_count_remaining:user_list_data.remaining
        }})
        : res.status(500).send({message:user_list_data.error,status:500})

    } catch (error) {
        res.status(500).send({message:error,status:500})
        console.log(error)
    }
})

user_router.get("/user/get/single",async (req,res)=>{
        const user_auth = readToken(req.cookies['auth_token'])
    try {
        
        const {type,username,hasImage} = req.query
        let user_data = null;
        let following_data = null;
        let same_user = null;
        let formated_data = null;
        if(!user_auth.validated){
            return res.status(401).send({message:"Usuário não autenticado",status:401})
        }

        const createFormatedData = (userData,followingData,sameUser)=>{

            return !!(type !== 'important')
            ? ({
                    user:userData,
                    following:followingData,
                    same_user:sameUser
            })
            :( {
                user:userData
            })

        }

        switch (type) {
            case "small":
                user_data = await supabase
                .from("tb_user")
                .select("username,namertag"+(!!hasImage && ",image:small_profile_photo"))
                .eq("id",user_auth.id);

                following_data = await supabase
                .from("vw_table_following")
                .select("following_id")
                .eq("user_id",user_auth.id)
                .eq("following_username",username)///username

                same_user = await supabase
                .from("tb_user")
                .select("username")
                .eq("id",user_auth.id)
                .eq("username",username)

                !!same_user
                &&
                !!following_data.data
                &&
                !!user_data.data
                &&
                (()=>{
                    formated_data = createFormatedData(
                        user_data.data[0],
                        !!following_data.data.length,
                        !!same_user.data.length);
                })()

            break;
            case "social":
                user_data = await supabase
                .from("tb_user")
                .select("username,namertag,followers_qnt,following_qnt,post_qnt,image:big_profile_photo")
                .eq("username",username)

                following_data = await supabase
                .from("vw_table_following")
                .select("following_id") 
                .eq("user_id",user_auth.id)
                .eq("following_username",username)///username

                same_user = await supabase
                .from("tb_user")
                .select("username")
                .eq("id",user_auth.id)
                .eq("username",username)

                !!same_user
                &&
                !!following_data.data
                &&
                !!user_data.data
                &&
                (()=>{
                    formated_data = createFormatedData(
                        user_data.data[0],
                        !!following_data.data.length,
                        !!same_user.data.length);
                })()

            break;
            case "important":
                
                user_data = await supabase
                .from("tb_user")
                .select("username,email")
                .eq("username",username)

                !!user_data.data
                &&
                (()=>{
                    formated_data = createFormatedData(
                        user_data.data[0],
                        [],
                        true);
                })()
            break;
            default:
            break;
        }

        const verifyQuery = 
        !!(type === 'important')
        ? !!(user_data.data)
        : !!(user_data.data && following_data.data && same_user.data)


        verifyQuery
        &&
        formated_data
        ? (()=>{
            return res.status(200).send({message:"Usuário listado com sucesso",status:200,
            data:formated_data
        })
        })()
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

      

    } catch (error) {
        console.log(error)
        res.status(500).send({message:error,status:500})
    }
})

module.exports = {
    user_router
}
