const prettyjson = require('prettyjson');
const crypto = require("crypto");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();


const makeTransaction = (req,res) => {
    let mpesaCell = req.body.properTel;
    let amount = req.body.totalPrice;
    let token = "";
    let checkOutReqId = "";
    let responseCode = "";
// Get request to MPESA with the customer key and customer secret to receive an access token
    async function mpesaMain(){
        try{
            // never forget to include the full colon when using basic auth, as it separates the key value pairs
            const both = (process.env.CONSUMER_KEY + process.env.CONSUMER_SECRET)
            const {data} = await axios.get("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
                        { headers:{
                                    "Content-Type":"application/json",
                                    Authorization: `Basic ${Buffer.from(both).toString("base64")}`.replace(/=/g,"")
                                }		
                        }
                    )			
            token = data.access_token
                        
            // post request to MPESA with the authorization token and parameters needed for a successful Lipa na mpesa STK-push payment
    
            const mpesaExpressApi = async()=>{
                try{
                        const passkey = process.env.PASSKEY
                        const t = new Date(Date.now());
                        let yyyy = t.getFullYear();
                        let mm = t.getMonth()+ 1;
                        let dd = t.getDate();
                        let hr = t.getHours();
                        let mn = t.getMinutes();
                        let sc = t.getSeconds();
                        function addZero(x){
                            if(x<10){
                                return `0${x}`
                            }
                            else{
                                return `${x}`
                            }
                        }
                        mm = addZero(mm);
                        dd = addZero(dd);
                        hr = addZero(hr);
                        mn = addZero(mn);
                        sc = addZero(sc);
                        const timeStamp = ``+yyyy + mm + dd + hr + mn + sc;
                        const password = Buffer.from(`${process.env.BUSINESS_SHORT_CODE}${passkey}${timeStamp}`).toString("base64");
                        const authToken = "Bearer ".concat(token);
    
                        const body = JSON.stringify({
                            // Business short Code usually is the paybill number or till number. 5-7 digit number 
                            "BusinessShortCode": process.env.BUSINESS_SHORT_CODE,
                            // Password is a base 64 encoding of the business short code, the timestamp, and a passkey from safaricom
                            "Password": password.replace("=",""),
                            "Timestamp": timeStamp,
                            "TransactionType": "CustomerPayBillOnline",
                            "Amount": `${amount}`,
                            "PartyA": `${mpesaCell}`,
                            "PartyB": process.env.BUSINESS_SHORT_CODE,
                            "PhoneNumber": `${mpesaCell}`,
                            "CallBackURL": "https://6a99-102-219-208-154.ngrok.io/api/paymentCell/callBack",
                            "AccountReference": "Kombucha Kenya",
                            "TransactionDesc": "Payment of Kombucha or Kefir" 
                        })
                        console.log("timeStamp =>" + timeStamp)
                        console.log("pwd =>" + password)
                        const {data} = await axios.post("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
                                        body,{headers:{
                                            "Content-Type":"application/json",
                                            Authorization: authToken
                                            }
                                        })
                        // console.log(data);
                         checkOutReqId = data.CheckoutRequestID
                         responseCode = data.ResponseCode
    
    
                    }catch(error){
                    console.log(error);
                }
    
            }
    
            mpesaExpressApi()
    
        }
        catch(error){
            console.log(error.message)
        }
    }
    mpesaMain();
    
    const mpesaQueryTransaction = async(resCode,checkoutID)=>{
        try{
            const passkey = process.env.PASSKEY
            const t = new Date(Date.now())
            const timeStamp = `${t.getFullYear()}${t.getMonth()+1}${t.getDate()}${t.getHours()}${t.getMinutes()}${t.getSeconds()}`
            const password = Buffer.from(`${process.env.BUSINESS_SHORT_CODE}${passkey}${timeStamp}`).toString("base64");
            const body = JSON.stringify({
                "BusinessShortCode":process.env.BUSINESS_SHORT_CODE,
                "Password":  password.replace("=",""),
                "Timestamp": timeStamp,
                "CheckoutRequestID" : checkoutID,
            })
            const {data} = await axios.post("https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query",body,{headers:{"Content-Type":"application/json", Authorization :  "Bearer ".concat(token)}})
            if(data.ResultCode == 0){
                    res.send("payment successfull")
                return(0)
            }else{
                    res.send("payment unsuccessfull")
                return(1)
            }
        }catch(e){
            console.error(e.message)
        }
        
        
    }
    setTimeout(function() {  mpesaQueryTransaction(responseCode,checkOutReqId) }, 5000);
   
 
}


const mpesaHooks = (req,res)=> {

        console.log('-----------Received M-Pesa webhook-----------');
          
        // format and dump the request payload recieved from safaricom in the terminal
        console.log(prettyjson.render(req.body, {color:"magenta"}));
        console.log('-----------------------');
          
        let message = {
            "ResponseCode": "00000000",
            "ResponseDesc": "success"
          };
          
        // respond to safaricom servers with a success message
        res.json(message);
}
module.exports = {makeTransaction,mpesaHooks}