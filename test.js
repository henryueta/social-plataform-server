const {supabase} = require("./api/config/database.js");


        (()=>{

            const image_path = supabase.storage
        .from("social-plataform-storage")
        .getPublicUrl("/post/teste")

            console.log(image_path.data.publicUrl)
            
        })();


        
