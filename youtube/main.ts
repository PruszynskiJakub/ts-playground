import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const videoUrl = "https://www.youtube.com/watch?v=9hE5-98ZeCg";

async function analyzeVideo() {
  console.log("Analyzing YouTube video:", videoUrl);
  console.log("=".repeat(50));

  // Transcription
  console.log("\n📝 TRANSCRIPTION:");
  const transcriptionResult = await model.generateContent([
    "Please provide a detailed transcription of the video content.",
    {
      fileData: {
        fileUri: videoUrl,
      },
    },
  ]);
  console.log(transcriptionResult.response.text());

  // Summary
  console.log("\n📋 SUMMARY:");
  const summaryResult = await model.generateContent([
    "Please summarize the video in 3-5 sentences, capturing the main points.",
    {
      fileData: {
        fileUri: videoUrl,
      },
    },
  ]);
  console.log(summaryResult.response.text());

  // Key Takeaways
  console.log("\n🔑 KEY TAKEAWAYS:");
  const takeawaysResult = await model.generateContent([
    "List the top 5 key takeaways from this video in bullet points.",
    {
      fileData: {
        fileUri: videoUrl,
      },
    },
  ]);
  console.log(takeawaysResult.response.text());
}

analyzeVideo().catch(console.error);