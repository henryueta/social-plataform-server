const jsonwebtoken = require('jsonwebtoken')


const readToken = (auth)=>{
    
    if(!auth){
        return {
            validated:false,
            id:null
        }
    }
    const formated_token = jsonwebtoken.verify(auth.token,'shhhhh');

    return {
        validated:true,
        id:formated_token['user_id']
    }
}

module.exports = {
    readToken
}