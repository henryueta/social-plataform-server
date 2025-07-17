const express = require('express')
const {supabase} = require('../config/database.js')
const {upload} = require('../../middlewares/multer.js')
const { readToken } = require('../../functions/token.js')
const { onQueryDataList } = require('../../functions/listLimit.js')

const notification_router = express.Router()


notification_router.get("/notification/get",async(req,res)=>{
    const user_auth = readToken(req.cookies['auth_token'])
    try {
        if(!user_auth){
            return res.status(401).send({message:"Usuário não autenticado",status:401})
        }

        const notification_list_data = await supabase.from("vw_table_notification")
        .select(`
            post_id,
            sender_username,
            receiver_username,
            description,
            was_read,
            creation_date_interval
            `)
        .eq("receiver_id",user_auth.id)

        !notification_list_data.error
        ? res.status(200).send({
            message:"Notificações listadas com sucesso",
            status:200,
            data:{
                notification_list:notification_list_data.data
            }
        })
        :res.status(500).send({message:notification_list_data.error,status:500})

    } catch (error) {
        console.log(error)
        res.status(500).send({message:error,status:500})
    }
})

module.exports = {
    notification_router
}