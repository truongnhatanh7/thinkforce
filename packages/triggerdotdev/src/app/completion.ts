import { ChatOpenAI } from "@langchain/openai";
import { envvars } from "@trigger.dev/sdk/v3";
import { TRIGGER_PROJECT_NAME } from "../../trigger.config";

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
  } else {
    throw new Error("Model not found");
  }
};
