const { supabase } = require("../api/config/database");
const { namertag_list } = require("../objects/namertag_list");

    

const createRandomNamertag = async (id)=>{

    const last_users_with_namertag =await supabase.from("tb_user")
    .select("namertag")
    .order('creation_date',{ascending:false})
    .neq("id",id)
    .limit(2)

    const last_namertag_list = last_users_with_namertag.data.map((user)=>user.namertag)
    
    let random_namertag = null;
    let same_namertag = true;

    while(same_namertag){

        random_namertag = Math.floor(Math.random() * (namertag_list.length - 0)+0)
        same_namertag = last_namertag_list.includes(namertag_list[random_namertag])
        
    }   
    
       const big_path = supabase.storage
        .from("social-plataform-storage")
        .getPublicUrl(
            "profile/default/big/"
            +namertag_list[random_namertag].type
            +"/"
            +namertag_list[random_namertag].image_label+".webp"
        )

        const small_path = supabase.storage
        .from("social-plataform-storage")
        .getPublicUrl(
            "profile/default/small/"
            +namertag_list[random_namertag].type
            +"/"
            +namertag_list[random_namertag].image_label+".webp"
        )

    return !same_namertag
    &&
    {
        type:namertag_list[random_namertag].type,
        big_path:big_path.data.publicUrl,
        small_path:small_path.data.publicUrl
    }

}



module.exports = {
    createRandomNamertag
}