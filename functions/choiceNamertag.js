const { supabase } = require("../api/config/database")
const { namertag_list } = require("../objects/namertag_list")

const onChoiceNamertag = async (type)=>{

    const current_namertag = namertag_list.find((namertag)=>{
        return namertag.type === type
    })

    const big_path = supabase.storage
        .from("social-plataform-storage")
        .getPublicUrl(
            "profile/default/big/"
            +current_namertag.type
            +"/"
            +current_namertag.image_label+".webp"
        )

        const small_path = supabase.storage
        .from("social-plataform-storage")
        .getPublicUrl(
            "profile/default/small/"
            +current_namertag.type
            +"/"
            +current_namertag.image_label+".webp"
        )

        return {
            namertag:current_namertag.type,
            big_path:big_path.data.publicUrl,
            small_path:small_path.data.publicUrl
        }

}


module.exports = {
    onChoiceNamertag
}