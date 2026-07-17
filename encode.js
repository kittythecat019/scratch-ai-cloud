const chars =
"1234567890qwertyuiopasdfghjklzxcvbnm,.@#₫_&-+()/*\"':;!?=\\][}{%~ ";



const encodeMap = {};
const decodeMap = {};



for(let i=0;i<chars.length;i++){

    let code =
    String(i+10).padStart(2,"0");


    encodeMap[chars[i]]=code;

    decodeMap[code]=chars[i];

}



function normalize(text){

    return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/đ/g,"d");

}



export function encode(text){

    text =
    normalize(text || "");


    let result="";


    for(let c of text){

        result +=
        encodeMap[c]
        ??
        encodeMap[" "];


    }


    return result;

}




export function decode(text){


    let result="";


    for(
        let i=0;
        i<text.length;
        i+=2
    ){

        let code =
        text.substring(i,i+2);


        result +=
        decodeMap[code] ?? "";


    }


    return result;

}