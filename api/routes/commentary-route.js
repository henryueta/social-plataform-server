const express = require('express')
const jsonwebtoken = require('jsonwebtoken')
const {supabase} = require('../config/database.js')
const { readToken } = require('../../functions/token.js')
const {upload} = require('../../middlewares/multer.js')
const { onQueryDataList } = require('../../functions/listLimit.js')


const commentary_router = express.Router()

commentary_router.post("/commentary/post",upload.none(),async(req,res)=>{
    const user_auth = readToken(req.cookies['auth_token'])
    try {
        if(!user_auth){
            return res.status(401).send({message:"Usuário não autenticado",status:401})
        } 
        const {type} = req.query

        const {description,post_id,thread_id,for_respond_id} = req.body
        

        const commentary_current_data = 
        !!(type === 'commentary')
        ? (async ()=>{

        const user_for_response = await supabase.from("vw_table_post_commentary")
        .select("username")
        .eq("commentary_id",for_respond_id)

            console.log("DATA",req.body)

            return !user_for_response.error
            ?  {
                description:`@${user_for_response.data[0].username} ${description}`,
                fk_id_user:user_auth.id,
                fk_id_post:post_id,
                fk_id_thread:thread_id,
                fk_id_for_respond:for_respond_id
            }
            : {
                description:description,
                fk_id_user:user_auth.id,
                fk_id_post:post_id,
                fk_id_thread:thread_id,
                fk_id_for_respond:for_respond_id
            } 
            

        })()
        : {
            description:description,
            fk_id_user:user_auth.id,
            fk_id_post:post_id
        }



        const commentary_action_data = await supabase.from("tb_commentary")
        .insert((await commentary_current_data))
        .select("id");

        const post_data  = await supabase.from("tb_post")
        .select("commentary_qnt")
        .eq("id",post_id)

        !commentary_action_data.error
        &&
        !post_data.error
        ? (async ()=>{

            const commentary_data = await supabase.from("vw_table_post_commentary")
            .select(`commentary_id,
            post_id,
            username,
            user_small_photo,
            description,
            like_qnt,
            response_quantity,
            creation_date_interval`)
            .eq("commentary_id",commentary_action_data.data[0].id);

            await supabase.from("tb_post")
            .update({
                commentary_qnt:(post_data.data[0].commentary_qnt+1)
            })
            .eq("id",post_id);

            return !commentary_data.error
            ?
            res.status(201).send(
                {message:"Comentário adicionado com sucesso",
                status:201,
                data:{
                    commentary:commentary_data.data[0]
                }
            })
            : res.status(500).send({message:commentary_data.error,status:500})
        })()
        : res.status(500).send({message:commentary_action_data.error,status:500})

    }
    catch(error){
        console.log(error)
        res.status(500).send({message:error,status:500})
    }
    })

commentary_router.get("/commentary/get",async(req,res)=>{
    const user_auth = readToken(req.cookies['auth_token'])
    try {
        if(!user_auth){
            return res.status(401).send({message:"Usuário não autenticado",status:401})
        } 
        const {type,table_id,limit,page} = req.query

        const limit_number = parseInt(limit)
        const page_number = parseInt(page)

        let commentary_data = null;
        let commentary_like_data = null;
        let user_commentary_data = null;

        // commentary_count = supabase.from('vw_table_post_commentary')
        // .select("username",{
        //     count:'exact'
        // })
        // .eq(type === 'post'
        // ? 'post_id'
        // : 'for_respond_id',
        // table_id)
        
        // if (type === 'post') {
        // commentary_count = commentary_count.is('thread_id', null);
        // } else {
        // commentary_count = commentary_count.not('thread_id', 'is', null);
        // }

        commentary_data = await onQueryDataList(
        limit_number,
        page_number,
        {
            name:'vw_table_post_commentary',
            fieldSelect:`
            commentary_id,
            post_id,
            thread_id,
            for_respond_id,
            username,
            namertag,
            user_small_photo,
            description,
            like_qnt,
            response_quantity,
            creation_date_interval`
        },[
            {
                column:type === 'post' 
                ? 'post_id'
                : 'for_respond_id',
                operator:"eq",
                value:table_id
            },
            {
                column:"for_respond_id",
                operator:type === 'post'
                ? "is"
                : "not",
                value:null
            },
            {
                column:"creation_date",
                operator:"order",
                value:{
                    ascending:type === 'post'
                    ? false
                    : true
                }
            }
        ])
        
        console.log("comentario",commentary_data.data)


        user_commentary_data = await supabase.from("vw_table_post_commentary")
        .select("commentary_id")
        .in("commentary_id",(commentary_data).data.map((commentary)=>{
            return commentary.commentary_id
        }))
        .eq("user_id",user_auth.id);

        commentary_like_data = await supabase.from("tb_commentary_like")
        .select("fk_id_commentary")
        .in("fk_id_commentary",(commentary_data).data.map((commentary)=>{
                        return commentary.commentary_id
        }))
        .eq("fk_id_user",user_auth.id)

        // commentary_like_data = await onQueryDataList(
        //     limit_number,
        //     page_number,
        //     {
        //         name:"tb_commentary_like",
        //         fieldSelect:"fk_id_commentary"
        //     },
        //     [
        //         {
        //             column:"fk_id_commentary",
        //             operator:"in",
        //             value:(await commentary_data).data.map((commentary)=>{
        //                 return commentary.commentary_id
        //             })
        //         },
        //         {
        //             column:'fk_id_user',
        //             operator:"eq",
        //             value:user_auth.id
        //         }
        //     ]
        // )

        // commentary_like_data = 
        // !(await commentary_data.error)
        // ?
        // (async()=>{
        //     const commentary_user_like = await supabase.from("tb_commentary_like")
        // .select("fk_id_commentary")
        // .in('fk_id_commentary',(await commentary_data).data.map((commentary)=>commentary.commentary_id))
        // .eq("fk_id_user",user_auth.id)
        // .limit(limit)

        //     return !commentary_user_like.error
        //     &&
        //     commentary_user_like.data.map((commentary)=>commentary.fk_id_commentary)

        // })()
        // : []
        

        !(await commentary_data.error)
        &&
        !(await commentary_like_data.error)
        ?
        res.status(200).send({message:"Comentários listados com sucesso",status:200,data:{
            commentary_list:(await commentary_data).data,
            user_commentary_list:user_commentary_data.data.map((commentary)=>commentary.commentary_id),
            liked_commentary_list:(await commentary_like_data).data.map((commentary)=>commentary.fk_id_commentary),
            commentary_list_count_remaining:((await commentary_data).remaining)
        }})
        :
        res.status(500).send({message:"Erro interno no Servidor",status:500})

    } catch (error) {
        console.log(error)
        res.status(500).send({message:error,status:500})
    }

})

module.exports = {
    commentary_router
}