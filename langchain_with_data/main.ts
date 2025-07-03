import {YoutubeLoader} from "@langchain/community/document_loaders/web/youtube";
import {PDFLoader} from "@langchain/community/document_loaders/fs/pdf";
import {
    RecursiveCharacterTextSplitter,
    CharacterTextSplitterParams,
    MarkdownTextSplitter
} from "@langchain/textsplitters";
import {MemoryVectorStore} from "langchain/vectorstores/memory";
import {ChatOpenAI, OpenAIEmbeddings} from "@langchain/openai";
import OpenAI from "openai";
import { ContextualCompressionRetriever } from "langchain/retrievers/contextual_compression";
import { LLMChainExtractor } from "langchain/retrievers/document_compressors/chain_extract";

console.log("Hello from langchain_with_data!");

async function main() {
    console.log("Starting langchain_with_data application...");

    const loader = new PDFLoader("langchain_with_data/docs/Machine Learning Lecture 01.pdf")
    const pages = await loader.load()
    console.log(pages.length);
    console.log(pages[0].pageContent.substring(0, 500))
    console.log(pages[0].metadata)

    const rsplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 800,
        chunkOverlap: 200
    })
    const splits = await rsplitter.splitDocuments(pages)

    console.log(splits.length)

    // Clean metadata for Chroma compatibility
    const cleanedSplits = splits.map(doc => ({
        ...doc,
        metadata: {
            source: doc.metadata.source,
            pageNumber: doc.metadata.loc?.pageNumber || 1,
            totalPages: doc.metadata.pdf?.totalPages || 0
        }
    }))

    // const url = "https://www.youtube.com/watch?v=jGwO_UgTS7I"
    // const ytloader = YoutubeLoader.createFromUrl(url)
    //
    // const ytvideo = await ytloader.load()
    // console.log(ytvideo)

    const embeddings = new OpenAIEmbeddings();
    const vectorStore = await MemoryVectorStore.fromDocuments(
        cleanedSplits,
        embeddings
    );

    const llm = new ChatOpenAI({model: "gpt-4.1"})
    const compressor = new ContextualCompressionRetriever({
            baseCompressor: LLMChainExtractor.fromLLM(llm),
            baseRetriever: vectorStore.asRetriever(3)
        }
    )

    const docs = await compressor.invoke("what did they say about matlab?")
    console.log(docs)
}

main().catch(console.error);