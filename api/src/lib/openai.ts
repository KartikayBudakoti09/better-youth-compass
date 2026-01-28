import { AzureOpenAI } from "openai";
import { ENV } from "./env.js";

export const aoai = new AzureOpenAI({
  apiKey: ENV.AZURE_OPENAI_KEY,
  endpoint: ENV.AZURE_OPENAI_ENDPOINT,
  apiVersion: ENV.AZURE_OPENAI_API_VERSION,
  deployment: ENV.AZURE_OPENAI_DEPLOYMENT
});
