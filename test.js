
let seconds = 60;
let minutes = ((seconds/60).toFixed()-1);
let currentSeconds = 60;

let timerChange = setInterval(()=>{
       if(minutes >= 0 && currentSeconds > 0){
        currentSeconds-=1; 

        console.log(
        ((minutes < 10 ? ("0"+minutes) : minutes))
        +" : "+
        ((currentSeconds < 10) ? ("0"+currentSeconds) : currentSeconds)
        )

        if(currentSeconds === 0){
            minutes-=1;
            currentSeconds = 60;
        }
        return null
       }
       
       return clearInterval(timerChange)
  
}, 1000);