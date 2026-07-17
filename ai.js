require("dotenv").config();

async function askAI(prompt) {

    try{

        const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {

        method:"POST",

        headers:{
            "Authorization":
            `Bearer ${process.env.GROQ_API_KEY}`,

            "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

            model:"llama-3.1-8b-instant",

            messages:[

                {
                    role:"system",
                    content:"As a friendly chatbot, always respond in English and keep your responses concise, around 90 letters"
                },

                {
                    role:"user",
                    content:prompt
                }

            ]

        }),

        signal: AbortSignal.timeout(30000)

    }
);


        const data =
        await response.json();


        return data
        .choices[0]
        .message
        .content;


    }
    catch(err){

    console.log(
        "AI error:",
        err
    );


    return "AI ERROR";

}

}

module.exports = {
    askAI
};
