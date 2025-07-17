const express = require('express')
const jsonwebtoken = require('jsonwebtoken')
const {supabase} = require('../config/database.js')
const { readToken } = require('../../functions/token.js')
const { onQueryDataList } = require('../../functions/listLimit.js')

const like_router = express.Router()

const changeTableLike = async (type,table_id,user_id)=>{
    let table_action_data = null;
    let table_action_verify = null;
    let current_table_data = null;
    let formated_data = null

    const current_table = {
        name:`tb_${type}`,
        like_name:`tb_${type}_like`,
        fk_id:`fk_id_${type}`,
        like_insert_data:
        type === 'post'
        ? {
            fk_id_user:user_id,
            fk_id_post:table_id
        }
        :
        {
            fk_id_user:user_id,
            fk_id_commentary:table_id
        }
    }

    current_table_data = await supabase.from(current_table.name)
    .select("like_qnt")
    .eq("id",table_id);
    
    

    return !current_table_data.error
    &&
    (async()=>{

        table_action_verify = await supabase.from(current_table.like_name)//post_like-commen_like
        .select("id")
        .eq("fk_id_user",user_id)
        .eq(current_table.fk_id,table_id)


        formated_data = !table_action_verify.data.length
        ? (async()=>{
            table_action_data = await supabase.from(current_table.like_name)//post_like-commen_like
            .insert(current_table.like_insert_data);

            table_change_data = await supabase.from(current_table.name)//post-commen
            .update({
                like_qnt:current_table_data.data[0].like_qnt+=1
            })
            .eq('id',table_id)  

            return (!table_action_data.error
            &&
            !table_action_verify.error)
            && 
            {
                like_qnt:(current_table_data.data[0].like_qnt),
                isLiked:true
            }
        })()
        : (async()=>{
            table_action_data = await supabase.from(current_table.like_name)
            .delete()
            .eq("id",table_action_verify.data[0].id)

            table_change_data = await supabase.from(current_table.name)
            .update({
                like_qnt:current_table_data.data[0].like_qnt-=1
            })  
            .eq('id',table_id)  

            return (!table_action_data.error
            &&
            !table_action_verify.error)
            && 
            {
                like_qnt:(current_table_data.data[0].like_qnt),
                isLiked:false
            }

        })()
        return !!(await formated_data)
        && await formated_data
    })
}

like_router.post("/like/post",async(req,res)=>{
    const user_auth = readToken(req.cookies['auth_token'])
    try {
        if(!user_auth){
            return res.status(401).send({message:"Usuário não autenticado",status:401})
        }

        const {type,table_id} = req.query

        const tableLikeChange = (async()=>{
           const result =  await changeTableLike(type,table_id,user_auth.id)
            
            return result()

        })
            const likeChanged = tableLikeChange()

        try {
            
            res.status(200).send({message:"Tabela curtida com sucesso",status:200,
            data:await likeChanged})

        } catch (error) {
         res.status(500).send({message:error,status:500})

        }

    } catch (error) {
        console.log(error)
        res.status(500).send({message:error,status:500})
    }
})

like_router.get("/like/get",async(req,res)=>{
    try {

        const {hasImage,post_id,limit,page} = req.query

        const limit_number = parseInt(limit)
        const page_number = parseInt(page)

        const hasImageValue = 
        !!(hasImage.toLowerCase() === 'true')
        

        const like_list_data = (async()=>{

            const like_user_list = await onQueryDataList(limit_number,page_number,{
            name:"vw_table_like",
            fieldSelect:
            "username,user_id"+(
            !!hasImageValue
            ? ",user_small_photo"
            : ""
            )
            },[{
                column:"post_id",
                operator:"eq",
                value:post_id
            }]) 


            const like_following_list = 
            !!hasImageValue
            ? await supabase.from("tb_user")
            .select("username")
            .in("id",like_user_list.data.map((user)=>
                user.id
            ))
            : null

            return !!(
            (!like_user_list.error && !hasImageValue)
                ||
            (!like_following_list.error && !!hasImageValue && !like_user_list.error)
            )
            ?
            (async()=>{

                return {
                like_user_list:(await like_user_list).data.map((like_user)=>{
                    const default_like_user = {
                        username:like_user.username
                    }

                    return !!hasImageValue
                    ? {...default_like_user,image:like_user.user_small_photo}
                    : default_like_user
                }),
                like_following_list: 
                !!hasImageValue
                ? like_following_list.data
                : [],
                like_list_count_remaining:like_user_list.remaining
            }

            })()
            : (()=>{
                console.log("follow_list",!like_following_list.error)
                console.log("user_list",!like_user_list.error)
                console.log("image",!!hasImageValue)
                console.log("semImage",!!(!like_user_list.error && !hasImageValue))
                console.log("comImage",!!(!like_following_list.error && !!hasImageValue && !like_user_list.error))
                return {}
            })()


        })()

            !!(await like_list_data).like_user_list
            ? res.status(200).send({
                message:"Usuários listados com sucesso",
                status:200,
                data:(await like_list_data)
            })
            : res.status(500).send({
                message:"Erro ao listar usuários",
                status:500
            })
        
    } catch (error) {
        console.log(error)
        res.status(500).send({message:error,status:500})
    }
})

module.exports = {
    like_router
}