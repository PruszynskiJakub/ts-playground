import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const videoUrl = "https://www.youtube.com/watch?v=9hE5-98ZeCg";

async function analyzeVideo() {
  console.log("Analyzing YouTube video:", videoUrl);
  console.log("=".repeat(50));

  const [transcriptionResult, summaryResult, takeawaysResult] = await Promise.all([
    model.generateContent([
      "Please provide a detailed transcription of the video content.",
      {
        fileData: {
          fileUri: videoUrl,
        },
      },
    ]),
    model.generateContent([
      "Please summarize the video in 3-5 sentences, capturing the main points.",
      {
        fileData: {
          fileUri: videoUrl,
        },
      },
    ]),
    model.generateContent([
      "List the top 5 key takeaways from this video in bullet points.",
      {
        fileData: {
          fileUri: videoUrl,
        },
      },
    ])
  ]);

  console.log("\n📝 TRANSCRIPTION:");
  console.log(transcriptionResult.response.text());

  console.log("\n📋 SUMMARY:");
  console.log(summaryResult.response.text());

  console.log("\n🔑 KEY TAKEAWAYS:");
  console.log(takeawaysResult.response.text());
}

analyzeVideo().catch(console.error);