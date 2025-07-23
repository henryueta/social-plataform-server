require('dotenv').config();
const nodemailer = require('nodemailer');


const email_value = process.env.EMAIL_VALUE;
const pass_value = process.env.PASSWORD_VALUE;


const createConnection =  async ()=>{

const smtp = nodemailer.createTransport({
    host:"smtp.gmail.com",
    port:587,
    secure:false,
    auth:{
        user:email_value,
        pass:pass_value
    }
})

return smtp

}


const sendEmail = async(from,destination,subject,html,treatment)=>{

    const email_connection = await createConnection()
    try {
    const sendEmail = email_connection.sendMail({
    from:from,
    to:destination,
    subject:subject,
    html:html
    }).then((result)=>{
        email_connection.close()
        treatment.onThen(result)
    })
    .catch((error)=>{
        console.log(error)
        treatment.onCatch(error)
    })


} catch (error) {
    console.log(error)
}

}

module.exports = {
    sendEmail
}