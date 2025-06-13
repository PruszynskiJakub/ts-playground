import {config} from "dotenv";
import {ChatOpenAI, OpenAIEmbeddings} from "@langchain/openai";
import {HumanMessage, SystemMessage} from "@langchain/core/messages";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import {
    ChatPromptTemplate,
    FewShotChatMessagePromptTemplate,
} from "@langchain/core/prompts";


config({"path": "../.env"});

const model = new ChatOpenAI({model: "gpt-4o"});

// const systemTemplate = "Translate the following from English into {language}";
//
// const promptTemplate = ChatPromptTemplate.fromMessages([
//     ["system", systemTemplate],
//     ["user", "{text}"],
// ]);
//
// const promptValue = await promptTemplate.invoke({
//     language: "italian",
//     text: "hi!",
// });
//
// let message = await model.invoke(promptValue);
// console.log(message)


const examples = [
    { input: "2+2", output: "4" },
    { input: "2+3", output: "5" },
    { input: "2+4", output: "6" },
    { input: "What did the cow say to the moon?", output: "nothing at all" },
    {
        input: "Write me a poem about the moon",
        output:
            "One for the moon, and one for me, who are we to talk about the moon?",
    },
];

// This is a prompt template used to format each individual example.
const examplePrompt = ChatPromptTemplate.fromMessages([
    ["human", "{input}"],
    ["ai", "{output}"],
]);
const fewShotPrompt = new FewShotChatMessagePromptTemplate({
    examplePrompt,
    examples,
    inputVariables: [], // no input variables
});

const result = await fewShotPrompt.invoke({});
console.log(result.toChatMessages());

const finalPrompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a wondrous wizard of math."],
    fewShotPrompt,
    ["human", "{input}"],
]);

const chain = finalPrompt.pipe(model);

const result2 = await chain.invoke({ input: "What's the square of a triangle?" });
console.log(result2);


const toVectorize = examples.map(
    (example) => `${example.input} ${example.output}`
);
const embeddings = new OpenAIEmbeddings();
const vectorStore = await MemoryVectorStore.fromTexts(
    toVectorize,
    examples,
    embeddings
);