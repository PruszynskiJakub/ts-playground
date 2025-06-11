import { CharacterTextSplitter } from "@langchain/textsplitters";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";


const loader = new TextLoader(
    "splitter/essay.txt"
);

let documents = await loader.load()

// console.log(documents)

const textSplitter = new CharacterTextSplitter({
    separator: "\n\n",
    chunkSize: 400,
    chunkOverlap: 100,
});
const texts = await textSplitter.splitText(documents[0].pageContent.trim());
console.log(texts);
console.log(texts.length);

console.log("------------------------------------------------------------------")

const recursiveTextSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 400,
    chunkOverlap: 100,
});
const texts2 = await recursiveTextSplitter.splitText(documents[0].pageContent.trim());
console.log(texts2);
console.log(texts2.length);