console.log("INDEX START");

require("dotenv").config();

const http = require("http");

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {

    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    res.end("Scratch AI Cloud Running");

}).listen(PORT, "0.0.0.0", () => {

    console.log(
        "HTTP Server listening on",
        PORT
    );

});

const Scratch = require("scratch-api");
const { askAI } = require("./ai");


// ================= ENV =================

const SCRATCH_USERNAME =
    process.env.SCRATCH_USERNAME;

const SCRATCH_PASSWORD =
    process.env.SCRATCH_PASSWORD;

const PROJECT_ID =
    process.env.PROJECT_ID;



// ================= CHAR MAP =================

const chars =
"1234567890qwertyuiopasdfghjklzxcvbnm,.@#₫_&-+()/*\"':;!?=\\][}{%~ ";


const encodeMap = {};
const decodeMap = {};


for(let i = 0; i < chars.length; i++){

    let code =
        String(i + 10).padStart(2,"0");


    encodeMap[chars[i]] = code;
    decodeMap[code] = chars[i];

}



// ================= ENCODE =================

function encode(text){

    text =
        String(text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"")
        .replace(/đ/g,"d");


    let result = "";


    for(const c of text){

        result +=
            encodeMap[c] ??
            encodeMap[" "];

    }


    return result;

}



// ================= DECODE =================

function decode(text){

    let result = "";


    for(
        let i = 0;
        i < text.length;
        i += 2
    ){

        let code =
            text.substring(i,i+2);


        result +=
            decodeMap[code] ?? "";

    }


    return result;

}



// ================= SPLIT =================

function splitEncoded(text){

    let result = [];

    let current = "";


    for(
        let i = 0;
        i < text.length;
        i += 2
    ){

        let code =
            text.substring(i,i+2);


        if(code === "00"){

            result.push(current);

            current = "";

        }
        else{

            current += code;

        }

    }


    if(current){

        result.push(current);

    }


    return result;

}



// ================= SLEEP =================

function sleep(ms){

    return new Promise(
        resolve => setTimeout(resolve,ms)
    );

}



// ================= LOGIN =================

function createSession(){

    return new Promise(
        (resolve,reject)=>{


            Scratch.UserSession.create(

                SCRATCH_USERNAME,
                SCRATCH_PASSWORD,


                (err,session)=>{


                    if(err){

                        reject(err);

                        return;

                    }


                    resolve(session);

                }

            );


        }
    );

}



function createCloud(session){

    return new Promise(
        (resolve,reject)=>{


            session.cloudSession(

                PROJECT_ID,


                (err,cloud)=>{


                    if(err){

                        reject(err);

                    }
                    else{

                        resolve(cloud);

                    }

                }

            );


        }
    );

}



// ================= SET CLOUD =================

async function setCloud(
    cloud,
    name,
    value
){

    console.log(
        "SEND:",
        name,
        value
    );


    try{

        cloud.set(
            name,
            String(value)
        );


        console.log(
            "SET OK"
        );


    }
    catch(err){

        console.log(
            "SET ERROR:",
            err.message
        );

    }


    await sleep(5000);

};

// ================= AI QUEUE =================

let queue = [];

let busy = false;



// ================= PROCESS QUEUE =================

async function processQueue(cloud){


    if(busy)
        return;


    if(queue.length === 0)
        return;



    busy = true;



    let item =
        queue.shift();



    console.log(
        "PROCESS QUEUE:",
        item
    );



    let answer;


    try{

        answer =
            await askAI(item.question);
      answer = answer.substring(0,100);
    }
    catch(err){

        console.log(
            "AI ERROR:",
            err
        );


        answer =
            "loi ai";

    }



    console.log(
        "ANSWER:",
        answer
    );



    let output =

        encode("4")
        +"00"+

        encode(item.id)
        +"00"+

        encode(item.username)
        +"00"+

        encode(answer)
        +"00";



    await setCloud(

        cloud,

        item.cloud,

        output

    );



    // reset cloud

    await setCloud(

        cloud,

        item.cloud,

        "0"

    );



    busy = false;



    // xử lý câu tiếp theo

    processQueue(cloud);

}





// ================= PROCESS CLOUD =================

async function processCloud(
    name,
    value,
    cloud
){


    value =
        String(value);



    if(
        value === "0" ||
        value === ""
    ){

        return;

    }



    console.log(
        "CLOUD CHANGE:",
        name,
        value
    );



    // chờ cloud ổn định

    await sleep(2000);



    let commandCode =
        value.substring(0,2);



    console.log(
        "COMMAND CODE:",
        commandCode
    );



    let raw =
        splitEncoded(value);



    console.log(
        "RAW:",
        raw
    );



    let data =
        raw.map(
            x => decode(x)
        );



    console.log(
        "DATA:",
        data
    );



    let command =
        data[0];



    // =========================
    // LỆNH 1
    // encode("1") = 10
    // =========================

    if(command === "1"){


        let id =
            data[1];


        let username =
            data[2];



        console.log(
            "REGISTER:",
            id,
            username
        );



        let output =

            encode("2")
            +"00"+
            encode(id)
            +"00"+
            encode(username)
            +"00";



        await setCloud(

            cloud,

            name,

            output

        );



        return;

    }





    // =========================
    // LỆNH 3
    // encode("3") = 12
    // =========================

    if(command === "3"){


        let id =
            data[1];


        let username =
            data[2];


        let question =
            data[3];



        console.log(
            "ADD AI:",
            id,
            username,
            question
        );



        queue.push({

            cloud:name,

            id:id,

            username:username,

            question:question

        });



        console.log(
            "QUEUE LENGTH:",
            queue.length
        );



        processQueue(cloud);


    }


}





// ================= START =================

async function start(){


    console.log(
        "Logging in..."
    );



    const session =
        await createSession();



    console.log(
        "Connecting cloud..."
    );



    const cloud =
        await createCloud(session);



    console.log(
        "Cloud connected"
    );



    cloud.on(

        "set",

        async(name,value)=>{


            console.log(
                "RECV:",
                name,
                value
            );



            if(

                name === "☁ cloud1" ||
                name === "☁ cloud2" ||
                name === "☁ cloud3" ||
                name === "☁ cloud4" ||
                name === "☁ cloud5"

            ){

                await processCloud(

                    name,

                    value,

                    cloud

                );

            }


        }

    );


}



// ================= RUN =================

start().catch(err => {

    console.error(
        "START ERROR:",
        err
    );

});
