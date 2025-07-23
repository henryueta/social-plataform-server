const createCheckoutCode = ()=>{

        const code_value_list = [];

        for(let i=0;i < 4;i++){

            code_value_list.push(
                Math.floor(Math.random()*(9 - 1 + 1))+1
            )

        }
        return code_value_list
    }

    module.exports = {
        createCheckoutCode
    }