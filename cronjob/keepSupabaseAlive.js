const cron = require('node-cron')
const { supabase } = require('../api/config/database')

const onPingDatabase = async ()=>{

    try {
        
        const supabase_ping = await supabase.from("tb_user")
        .select("id")
        .limit(1)

        if(supabase_ping.error){
           return console.log("Falha na consulta no período: ",new Date().toISOString())
        }
        return console.log("Consulta realizada no período: ",new Date().toISOString())

    } catch (error) {
        console.log(error)
    }

}

const onPingCronJob = ()=>{
    cron.schedule('0 */10 * * *',()=>{
        onPingDatabase()
    })
}


module.exports = {
    onPingCronJob
}