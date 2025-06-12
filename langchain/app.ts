import { config } from "dotenv";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

config();

console.log('LANGSMITH_ENDPOINT:', process.env.LANGSMITH_ENDPOINT);

const model = new ChatOpenAI({ model: "gpt-4o" });
const messages = [
    new SystemMessage("Translate the following from English into Italian"),
    new HumanMessage("hi!"),
];

let message = await model.invoke(messages);
console.log(message)
