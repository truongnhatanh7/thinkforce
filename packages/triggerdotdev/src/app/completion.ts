import { ChatOpenAI } from "@langchain/openai";
import { envvars } from "@trigger.dev/sdk/v3";
import { TRIGGER_PROJECT_NAME } from "../../trigger.config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export const getModel = async (
  modelName: string,
  temperature: number,
  streaming = false
) => {
  if (modelName.includes("gpt-4o-mini")) {
    const openAIKey = await envvars.retrieve(
      TRIGGER_PROJECT_NAME,
      "dev",
      "OPEN_AI_KEY"
    );

    return new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: temperature,
      apiKey: openAIKey.value,
      streaming: streaming,
      maxTokens: -1,
    });
  } else if (modelName.includes("gpt-4o")) {
    const openAIKey = await envvars.retrieve(
      TRIGGER_PROJECT_NAME,
      "dev",
      "OPEN_AI_KEY"
    );

    return new ChatOpenAI({
      model: "gpt-4o-2024-08-06",
      temperature: temperature,
      apiKey: openAIKey.value,
      streaming: streaming,
      maxTokens: -1,
    });
  } else if (modelName.includes("gemini-1.5-flash")) {
    const googleStudioAIApiKey = await envvars.retrieve(
      TRIGGER_PROJECT_NAME,
      "dev",
      "GOOGLE_STUDIO_AI_KEY"
    );

    return new ChatGoogleGenerativeAI({
      model: "gemini-1.5-flash",
      temperature: temperature,
      maxRetries: 2,
      apiKey: googleStudioAIApiKey.value,
    });
  } else {
    throw new Error("Model not found");
  }
};
