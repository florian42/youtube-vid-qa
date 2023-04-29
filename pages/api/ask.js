import { OpenAI } from "langchain/llms/openai";
import { ConversationalRetrievalQAChain } from "langchain/chains";
import { HNSWLib } from "langchain/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { YoutubeTranscript } from "youtube-transcript";
import unshorter from "unshorter";

const model = new OpenAI({});
const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 });

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

  const docs = await textSplitter.createDocuments([transcript]);
  const vectorStore = await HNSWLib.fromDocuments(docs, new OpenAIEmbeddings());

  const chain = ConversationalRetrievalQAChain.fromLLM(
    model,
    vectorStore.asRetriever()
  );

  const llmResponse = await chain.call({ question: prompt, chat_history: [] });

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
