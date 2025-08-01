const {supabase} = require('../api/config/database')

const onQueryDataList = async (limit, page, table, filters = []) => {


  const limit_start = limit * (page - 1);
  const limit_end = limit_start + limit - 1;

  console.log("listDataBody",{
    start:limit_start,
    end:limit_end,
    page:page,
    table:table,
    filters:filters
  })

  let query = supabase.from(table.name).select(table.fieldSelect, { count: 'exact' });

  filters.forEach(filter => {
    const { column, operator, value } = filter;
    
    if (query[operator]) {
      query = operator !== 'not'
      ? query[operator](column, value)
      : query[operator](column,'is', value);
      

      
    } else {
      console.warn(`Operador inválido: ${column} ${value} ${operator}`);
    }
  });

  const countResult = await query;


  if (countResult.error) {
    console.log({
        limit:limit,
        page:page,
        table:table,
        filters:filters
    })
    console.error('Erro ao contar dados:', countResult.error);
    return { error: countResult.error };
  }

  let dataQuery = supabase.from(table.name).select(table.fieldSelect).range(limit_start, limit_end);


  filters.forEach(filter => {
    const { column, operator, value } = filter;


    if (dataQuery[operator]) {
      
      dataQuery = operator !== 'not'
      ? dataQuery[operator](column, value)
      : dataQuery[operator](column,'is', value)



    }

  });

  const dataResult = await dataQuery;


  return {
    data: dataResult.data,
    count: countResult.count,
    error: dataResult.error,
    remaining:!!(((await query).count - (page * limit)) > 0)
  };
};



  // (async()=>{

  //   const teste = await supabase.from("vw_table_post").select("username").range(0,4)
  //   .eq("username","henry")

  // console.log(teste)

  // })()

// (async()=>{

//     let result = await onQueryDataList(5,3,{
//     name:'vw_table_post',
//     fieldSelect:"post_id,description"
// },[{column:"username",operator:"eq",value:"henry"}])

//     console.log(result.data)
// })()

module.exports = {
    onQueryDataList
}