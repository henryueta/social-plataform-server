const express = require('express')
const jsonwebtoken = require('jsonwebtoken')
const {supabase} = require('../config/database.js')
const hash = require('password-hash')
const {upload} = require('../../middlewares/multer.js')
const { readToken } = require('../../functions/token.js')
const { sendEmail } = require('../../functions/emailSender.js')
const { createCheckoutCode } = require('../../functions/codeConfirm.js')
require('dotenv').config();


const auth_router = express.Router()


const onCodePost = async (user_id)=>{

        let code_value = "";
        createCheckoutCode().forEach((code)=>
            code_value+=code
        )
                    
        const code_post = await supabase.from("tb_user_code")
        .insert({
            code:code_value,
            fk_id_user:user_id,
        })
        .select("code")

        console.log(await code_post.data[0].code)

        return !code_post.error
        ? (async ()=>{
            return {sucess:true,message:"Código gerado com sucesso",code_value:await code_post.data[0].code}
        })()
        : (async ()=>{
            return {success:false,message:code_post.error,code_value:null}
        })()

    }

auth_router.post("/auth/checkout",upload.none(),async(req,res)=>{
    const user_auth = readToken(req.cookies['auth_token'])
        try {
            if(!user_auth){
                return res.status(401).send({message:"Usuário não autenticado",status:401})
            } 
        const {code} = req.body

        const current_user_code = await supabase.from("vw_table_user_code")
        .select("code_id")
        .eq("user_id",user_auth.id)
        .eq("code_value",code)
        .eq('is_valid',true)
        .eq("code_is_used",false)


        if(current_user_code.data.length){
            
            await supabase.from("tb_user_code")
            .update({
                is_used:true
            })
            .eq("id",current_user_code.data[0].code_id)

            await supabase.from("tb_user")
            .update({
                is_checked:true
            })
            .eq("id",user_auth.id)

            return res.status(201).send({message:"Usuário verificado com sucesso",status:201,
                data:{
                    is_checked:true
                }
            })
        }

        if(!(current_user_code.data.length)){

            return res.status(401).send({message:"Código de confirmação inválido",status:401,
                data:{
                    is_checked:false
                }
            })
    
        }

        if(current_user_code.error){
            return res.status(500).send({message:current_user_code.error,status:500})
        }

    } catch (error) {
        console.log(error)
        res.status(500).send({message:error,status:500})
    }
})

auth_router.get("/auth/logout",upload.none(),async(req,res)=>{
    const user_auth = readToken(req.cookies['auth_token'])
        try {
            if(!user_auth){
                return res.status(401).send({message:"Usuário não autenticado",status:401})
            } 
        res.clearCookie('auth_token')
        res.status(200).send({message:"Logout realizado com sucesso",status:200})

    } catch (error) {
        res.status(500).send({message:error,status:500})
    }
})

auth_router.get("/auth/checkout",upload.none(),async (req,res)=>{
        const user_auth = readToken(req.cookies['auth_token'])
        try {
            if(!user_auth.validated){
                return res.status(401).send({message:"Usuário não autenticado",status:401})
            } 

            const user_checkout = await supabase.from("tb_user")
            .select("is_checked,email")
            .eq("id",user_auth.id)

            return !user_checkout.error
            ? !!(user_checkout.data[0].is_checked)
                ? res.status(200).send({message:"Usuário confirmado com sucesso",status:200,
                    data:user_checkout.data[0]
                })
                : (async()=>{

                    try {
                    let needCheckout = null;
                    let code_value = null;
                    
                        const code_data = await supabase.from("vw_table_user_code")
                        .select("is_valid,code_is_used,user_is_checked,code_value")
                        .eq("user_id",user_auth.id)
                    
                        if(code_data.data.length){
                        const current_code = code_data.data.find((code)=>
                            !(code.code_is_used)
                        )
                        
                        if(!current_code){
                            console.log("!current_code")
                            needCheckout = false;
                        }
                    
                        else if (!current_code.is_valid){
                            console.log('!current_code.is_valid')
                            needCheckout = true;
                            code_value = (await onCodePost(user_auth.id)).code_value;
                        }
                    
                        else if(current_code.is_valid){
                            console.log("current_code.is_valid")
                             needCheckout = true;
                            code_value = current_code.code_value;
                        }

                    
                        }
                        else{ 
                            needCheckout = true;
                            code_value = (await onCodePost(user_auth.id)).code_value
                        }
                        
                        if(needCheckout){
                            console.log("codigo",code_value)
                            sendEmail(
                                "Código de verificação",
                                user_checkout.data[0].email,
                                "Aqui está seu código de verificação",
                                `<p>${code_value}</p>`,
                                {
                                    onThen(result){
                                        // console.log("result",result)
                                    },
                                    onCatch(error){
                                        console.log("error",error)
                                    }
                                }
                            )
                        }

                        !!needCheckout
                        ? res.status(200).send({message:"Usuário precisa de confirmação",status:401,
                        data:user_checkout.data[0]
                        })
                        :
                        console.log("Usuário já possui confirmação")

                    } catch (error) {
                         console.log(error)
                         return res.status(500).send({message:error,status:500})
                    }

                })()
            : res.status(500).send({message:user_checkout.error,status:500})

        
    } catch (error) {
        console.log(error)
        res.status(500).send({message:error,status:500})
    }

})

auth_router.put("/auth/recovery",upload.none(),async(req,res)=>{

    try {

        const {token} = req.query
        const {password} = req.body

        const check_token = jsonwebtoken.verify(token,'shhhhh')

        const user_put = await supabase.from("tb_user")
        .update({
            password:hash.generate(password)
        })
        .eq("id",check_token['user_id'])
        .select("id")
        
        return !user_put.error
        ? res.status(201).send({message:"Senha alterada com sucesso",status:201})
        : res.status(500).send({message:user_put.error,status:500})

    } catch (error) {
        console.log(error)
        res.status(500).send({message:error,status:500})
    }

})

auth_router.get("/auth/forgot",upload.none(),async(req,res)=>{

    try {
        
        const {token} = req.query

        const check_token = await supabase.from("vw_table_password_recovery")
        .select("is_valid")
        .eq("token_value",token) 
        .eq("is_valid",true)

        console.log(check_token)

        return !!check_token.data.length
        ? res.status(200).send({message:"Token validado com sucesso",status:200})
        : res.status(401).send({message:"Token inválido ou expirado",status:401})

    } catch (error) {
        console.log(error)
        res.status(500).send({message:error,status:500})
    }

})

const sendAuthRecovery = (token,email)=>{

    const recovery_url = process.env.CLIENT_BASE_URL+"recovery/password/"+token;
                
        sendEmail(
            "Recuperação de senha",
            email,
            "Clique no link para alterar sua senha.Não compartilhe com ninguém",
            `<a href=${recovery_url}>Alterar senha</a>`,
            {
                onThen(result){
                     // console.log("result",result)
                },
                onCatch(error){
                    console.log("error",error)
                }
            }
        )
}

auth_router.post("/auth/forgot",upload.none(),async (req,res)=>{
        try {

            const {email} = req.body

            const check_email = await supabase.from("tb_user")
            .select("email")
            .eq("email",email)

            !!check_email.data.length
            ? (async()=>{
                const recovery_data = await supabase.from("vw_table_password_recovery")
                .select("token_value,token_is_used,is_valid")
                .eq("user_email",check_email.data[0].email)  
                .eq("is_valid",true)

                const user_id_data = await supabase.from("tb_user")
                .select("id")
                .eq("email",check_email.data[0].email)

                !(recovery_data.data.length)
                ? (async()=>{
                    const token_post = await supabase.from("tb_password_recovery")
                    .insert({
                        token:jsonwebtoken.sign({
                            user_id:await user_id_data.data[0].id
                        },"shhhhh"),
                        fk_id_user:await user_id_data.data[0].id,
                    })
                    .select("token")

                    let currentTokenValue = await token_post.data[0].token
                    sendAuthRecovery(currentTokenValue,check_email.data[0].email)
                })()
                
                : (async()=>{
                    let currentTokenValue = await recovery_data.data[0].token_value
                    sendAuthRecovery(currentTokenValue,check_email.data[0].email)
                })()        

            return res.status(201).send({message:"Email verificado com sucesso",status:201})
            })()
            : res.status(401).send({message:"Email inválido ou inexistente",status:401})

        }
        catch(error){
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
        
        const check_email = await supabase
        .from("tb_user")
        .select("password,id")
        .eq("email",email)

        if(!check_email.data.length){
            return res.status(401).send({message:"Email inválido ou inexistente",status:401})
        }
            const check_password = hash.verify(password,check_email.data[0].password)
        
        if(!check_password){
            return res.status(401).send({message:"Senha inválida",status:401})
        }

        console.log({
            password:check_password,
            email:check_email
        })

        return !!(!!check_password && !!check_email.data)
        ? (()=>{
            const auth_token = jsonwebtoken.sign({
                user_id:check_email.data[0].id
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
        : res.status(401).send({message:"Email ou senha inválidos",status:401})
    }
    catch(error){
        console.log(error)
        res.status(500).send({message:error,status:500})
    }

})


module.exports = {auth_router}