require('dotenv').config()
const nodemailer = require('nodemailer')
const {supabase} = require('../config/database')


    const onCodePost = async ()=>{

        let code_value = "";
        createCheckoutCode().forEach((code)=>
            code_value+=code
        )
                    
        const code_post = await supabase.from("tb_user_code")
        .insert({
            code:code_value,
            fk_id_user:"823a3827-4dc4-48b8-b3eb-9ec16c61f572",
        })

        return !code_post.error
        ? console.log("código criado para substituir o inválido e não usado")
        : console.log(code_post.error)

    }

    (async()=>{

        try {
            const code_data = await supabase.from("vw_table_user_code")
            .select("is_valid,code_is_used,user_is_checked")
            .eq("user_id",'823a3827-4dc4-48b8-b3eb-9ec16c61f572')
            
            const user_data = await supabase.from("tb_user")
            .select("is_checked")
            .eq("id","823a3827-4dc4-48b8-b3eb-9ec16c61f572")

            
            if(user_data.data[0].is_checked){
                return console.log("realizar nenhuma operação")
            }

            !!(code_data.data.length)
            ? 
            (async()=>{
                const current_code = code_data.data.find((code)=>
                    !!(!code.code_is_used)
                )

                if(!current_code){
                    return console.log("Usar nenhum codigo")
                }

                if (!current_code.is_valid){
                    onCodePost();
                }

                if(current_code.is_valid){
                   return console.log("Usar o codigo já existente")
                }

            })()
            : onCodePost();

        } catch (error) {
            console.log(error)
        }

    })()

