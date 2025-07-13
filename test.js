const {supabase} = require('./api/config/database.js')

const createRangeLimit = (limit,page)=>{

    const start = limit * (page - 1)

    const end = start + limit -1

    return {
        limit_start:start,
        limit_end:end
    }

}




let current_limit_page = 0;
let stop = true;

(async()=>{
while(stop){

    current_limit_page+=1;

    const data_count = await supabase.from("vw_table_post")
    .select("post_id",{count:"exact"});

    const limit_structure = createRangeLimit(5,current_limit_page);

    if(( data_count.count - (current_limit_page * 5)) <= 0){
            stop = false
    }

    const data = await supabase.from("vw_table_post")
    .select(`
    description,
    post_id
    `)
    .range(limit_structure.limit_start,limit_structure.limit_end);

!data.error
?
console.log(data.data)
:
console.log(data.error)
}

})()