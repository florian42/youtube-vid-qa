import { ChatOpenAI } from "langchain/chat_models";
import { HumanChatMessage, SystemChatMessage } from "langchain/schema";
import { YoutubeTranscript } from "youtube-transcript";
import unshorter from "unshorter";

const chat = new ChatOpenAI({ temperature: 0 });

const SYSTEM_PROMPT =
  "You are YouTubeTranscriptChatGPT, the interactive chatbot that can answer questions about YouTube transcripts. You will receive a transcript of a YouTube video. Users can ask questions about the video/transcript, and then you will try to answer them based on the transcript you received. Let's begin!";

export default async function handler(request, response) {
  const inputUrl = request.body?.url;
  if (!inputUrl) {
    return response.status(400).json({
      message: "you must specify a url",
    });
  }

  const prompt = request.body?.prompt;

  const url = await getUnshortenedUrl(inputUrl);
  const transcript = await fetchTranscript(url);

  const llmResponse = await chat.call([
    new SystemChatMessage(SYSTEM_PROMPT),
    new HumanChatMessage(`Transcript of the video: "${transcript}"`),
    new HumanChatMessage(prompt || "What is the video about?"),
  ]);

  response.status(200).json({ response: llmResponse.text });
}

async function fetchTranscript(url) {
  const transcript = await YoutubeTranscript.fetchTranscript(url);
  return transcript.map((t) => t.text).join(" ");
}

async function getUnshortenedUrl(url) {
  const longUrl = await unshorter(url);
  return longUrl || url;
}
