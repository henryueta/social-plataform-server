const express = require('express')
const jsonwebtoken = require('jsonwebtoken')
const {supabase} = require('../config/database.js')
const hash = require('password-hash')
const {upload} = require('../../middlewares/multer.js')
const { readToken } = require('../../functions/token.js')
const { sendEmail } = require('../../functions/emailSender.js')
const { createCheckoutCode } = require('../../functions/codeConfirm.js')

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

            return res.status(201).send({message:"Usuário verificado com sucesso",status:201})
        }

        if(!(current_user_code.data.length)){

            return res.status(401).send({message:"Código de confirmação inválido",status:401})
    
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
            if(!user_auth){
                return res.status(401).send({message:"Usuário não autenticado",status:401})
            } 
            const user_checkout = await supabase.from("tb_user")
            .select("is_checked,email")
            .eq("id",user_auth.id)

            !user_checkout.error
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
                            console.log("nem")
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
        
        const database_users = await supabase
        .from("tb_user")
        .select("email,password,id")

        const userLogged = database_users.data.find((user)=>
            !!(user.email === email && hash.verify(password,user.password))
        )
        !!userLogged
        ? (()=>{
            const auth_token = jsonwebtoken.sign({
                user_id:userLogged.id
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
        : res.status(401).send({message:"no auth",status:401})
    }
    catch(error){
        console.log(error)
        res.status(500).send({message:error,status:500})
    }

})


module.exports = {auth_router}