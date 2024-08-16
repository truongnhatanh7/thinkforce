import { ChatOpenAI } from "@langchain/openai";
import { envvars } from "@trigger.dev/sdk/v3";
import { TRIGGER_PROJECT_NAME } from "../../trigger.config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  GEMINI_FLASH_INPUT_HIGH_PRICE,
  GEMINI_FLASH_INPUT_LOW_PRICE,
  GEMINI_FLASH_OUTPUT_HIGH_PRICE,
  GEMINI_FLASH_OUTPUT_LOW_PRICE,
  GEMINI_HILO_BOUNDARY,
  GPT4O_INPUT_PRICE,
  GPT4O_MINI_INPUT_PRICE,
  GPT4O_MINI_OUTPUT_PRICE,
  GPT4O_OUTPUT_PRICE,
  ONEMILTOKENS,
} from "./const";

export const getModel = async (
  modelName: string,
  temperature: number,
  streaming = false,
) => {
  if (modelName.includes("gpt-4o-mini")) {
    const openAIKey = await envvars.retrieve(
      "OPEN_AI_KEY",
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
      "OPEN_AI_KEY",
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
      "GOOGLE_STUDIO_AI_KEY",
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

export const getGenCost = (
  modelName: string,
  inputTokens: number,
  outputTokens: number,
) => {
  switch (modelName) {
    case "gpt-4o-mini":
      return (
        (inputTokens * GPT4O_MINI_INPUT_PRICE +
          outputTokens * GPT4O_MINI_OUTPUT_PRICE) /
        ONEMILTOKENS
      );
    case "gpt-4o": // gpt-4o-2024-08-06
      return (
        (inputTokens * GPT4O_INPUT_PRICE + outputTokens * GPT4O_OUTPUT_PRICE) /
        ONEMILTOKENS
      );
    case "gemini-1.5-flash":
      return (
        (inputTokens * calculateGeminiFlashInputCost(inputTokens) +
          outputTokens * calculateGeminiFlashOutputCost(outputTokens)) /
        ONEMILTOKENS
      );
    default:
      throw new Error("Model not found");
  }
};

const calculateGeminiFlashInputCost = (inputTokens: number) => {
  if (inputTokens > GEMINI_HILO_BOUNDARY) {
    return GEMINI_FLASH_INPUT_HIGH_PRICE;
  }
  return GEMINI_FLASH_INPUT_LOW_PRICE;
};

const calculateGeminiFlashOutputCost = (outputTokens: number) => {
  if (outputTokens > GEMINI_HILO_BOUNDARY) {
    return GEMINI_FLASH_OUTPUT_HIGH_PRICE;
  }
  return GEMINI_FLASH_OUTPUT_LOW_PRICE;
};
