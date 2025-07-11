const express = require('express')
const jsonwebtoken = require('jsonwebtoken')
const {supabase} = require('../config/database.js')
const { readToken } = require('../../functions/token.js')

const commentary_router = express.Router()

commentary_router.get("/commentary/get",async(req,res)=>{
    const user_auth = readToken(req.cookies['auth_token'])
    try {
        if(!user_auth){
            return res.status(401).send({message:"Usuário não autenticado",status:401})
        } 
        const {type,table_id,limit} = req.query

        let commentary_data = null;
        let commentary_like_data = null;
        let commentary_count = null

        commentary_count = await supabase.from('vw_table_post_commentary')
        .select("username",{
            count:'exact'
        })
        .eq(type === 'post'
        ? 'post_id'
        : 'for_respond_id'    
        ,table_id)

        commentary_data = await supabase.from("vw_table_post_commentary")
        .select(`
        commentary_id,
        username,
        user_small_photo,
        description,
        like_qnt,
        creation_date_interval
        `)
        .eq(type === 'post'
        ? 'post_id'
        : 'for_respond_id'    
        ,table_id)
        .limit(limit)
        
        commentary_like_data = 
        !commentary_data.error
        ?
        (async()=>{
            const commentary_user_like = await supabase.from("tb_commentary_like")
        .select("fk_id_commentary")
        .in('fk_id_commentary',commentary_data.data.map((commentary)=>commentary.commentary_id))
        .eq("fk_id_user",user_auth.id)
        .limit(limit)

            return !commentary_user_like.error
            &&
            commentary_user_like.data.map((commentary)=>commentary.fk_id_commentary)

        })()
        : []


        !commentary_data.error
        &&
        !(await commentary_like_data.error)
        &&
        !commentary_count.error
        ?
        res.status(200).send({message:"Comentários listados com sucesso",status:200,data:{
            commentary_list:commentary_data.data,
            liked_commentary_list:await commentary_like_data,
            commentary_list_count_remaining:(commentary_count.count - limit)
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