import { getModel } from "./completion";
import { TRIGGER_PROJECT_NAME } from "../../trigger.config";
import {
  EXCLUDE_EXTENSIONS,
  EXCLUDE_PAGES,
  REDUCE_TOKEN_KWS,
} from "./google.helper";
import {
  GoogleResponse,
  TFGoogleSearchFusion,
  TFGoogleSearchFusionData,
} from "@thinkforce/shared";

import { envvars, logger } from "@trigger.dev/sdk/v3";
import jsdom from "jsdom";

const GOOGLE_SEARCH_URL = "https://customsearch.googleapis.com/customsearch/v1";
export class GoogleSearch {
  inputTokens: number;
  outputTokens: number;
  sourceMap: { [key: string]: TFGoogleSearchFusionData };

  constructor(sourceMap: { [key: string]: TFGoogleSearchFusionData }) {
    this.inputTokens = 0;
    this.outputTokens = 0;
    this.sourceMap = sourceMap;
  }

  private contentMinify(content: string): string {
    for (const kw of REDUCE_TOKEN_KWS) {
      content = content.replaceAll(kw, "");
    }

    return content;
  }

  private preprocessSearchQuery(query: string): string {
    for (const restrictSite of EXCLUDE_PAGES) {
      query += ` -site:${restrictSite}`;
    }

    return query;
  }

  private async parseLinkToBriefSummary(
    link: string,
    query: string,
  ): Promise<string> {
    try {
      const req = await fetch(link);
      const text = await req.text();
      const virtualConsole = new jsdom.VirtualConsole();
      const doc = new jsdom.JSDOM(text, { virtualConsole }).window.document;
      const content = Array.from(doc.querySelectorAll("p")).map(
        (p, index) => `${index} ${p.textContent}`,
      );
      const contentMinified = this.contentMinify(content.join("\n"));
      if (contentMinified.length >= 40000) {
        // 40,000 characters -> too large -> ignore
        return "";
      }

      const SYSTEM_PROMPT = `
      You are given a query and a list of sentences.
      Your task is to determine which sentences are relevant to the query.
      Ignore any sentences that are not relevant.
      After that, write a brief summary of the relevant sentences.

      You must also STRICTLY follow these rules:
        1. The summary MUST highlight main points of the relevant sentences ONLY .
        2. You MUST ONLY use information in the given sentences.
        3. Just return the summary only, don't add any irrelevant words.
        4. The summary MUST contains detailed informations that are key highlights that support the query.
        5. If applicable, the summary MUST includes quantitative data that are key highlights that support the query.
      `;

      const USER_PROMPT = `
      Given the query: "${query}"
      Relevant sentences:
      ${contentMinified}
      `;

      const model = await getModel("gemini-1.5-flash", 0);
      const completion = await model?.invoke([
        {
          type: "system",
          content: SYSTEM_PROMPT,
        },
        {
          type: "user",
          content: USER_PROMPT,
        },
      ]);

      this.inputTokens += completion?.usage_metadata?.input_tokens || 0;
      this.outputTokens += completion?.usage_metadata?.output_tokens || 0;

      logger.info("Parsing link to brief summary", {
        link: link,
        content: completion?.content.toString(),
      });

      return completion?.content.toString() || "";
    } catch (e) {
      logger.error("Error parsing link to brief summary", {
        link: link,
        error: e,
      });

      // Still executing task
      return "";
    }
  }

  private async rewriteSearchQuery(
    query: string,
    topic: string,
  ): Promise<string> {
    const model = await getModel("gemini-1.5-flash", 0);
    const SYSTEM_PROMPT = `
    Given a heading of a outline and a topic.
    Your task is to create a google search query that is relevant to the topic and the current heading.
    You should keep the result as short as possible since it will be used as a Google search query.
    Just return the rewritten query. Don't add any irrelevant words.
    `;
    const USER_PROMPT = `
    Given the heading: "${query}"
    Topic: ${topic}
    `;
    const completion = await model?.invoke([
      {
        type: "system",
        content: SYSTEM_PROMPT,
      },
      {
        type: "user",
        content: USER_PROMPT,
      },
    ]);

    this.inputTokens += completion?.usage_metadata?.input_tokens || 0;
    this.outputTokens += completion?.usage_metadata?.output_tokens || 0;

    logger.info("Rewriting search query", {
      query: completion?.content.toString(),
    });
    return completion?.content.toString().replaceAll('"', "") || "";
  }

  async search(
    query: string,
    originalTopic: string,
    limit = 2,
  ): Promise<TFGoogleSearchFusion> {
    query = await this.rewriteSearchQuery(query, originalTopic);

    const googleApiKey = (
      await envvars.retrieve("GOOGLE_API_KEY")
    ).value;

    const googleCseCx = (
      await envvars.retrieve("GOOGLE_CSE_CX")
    ).value;

    // Set up payload
    const payload: Record<string, string> = {
      key: googleApiKey,
      cx: googleCseCx,
      q: this.preprocessSearchQuery(query),
      num: limit.toString(),
      safe: "active",
    };

    let searchUrl = new URL(GOOGLE_SEARCH_URL);
    let searchParams = new URLSearchParams(payload);
    searchUrl.search = searchParams.toString();

    const req = await fetch(searchUrl);
    const res = (await req.json()) as GoogleResponse;
    logger.info("Google search response", {
      query,
      res,
    });

    if (!res?.items || res?.items?.length === 0) {
      return {
        data: [],
        inputTokens: this.inputTokens,
        outputTokens: this.outputTokens,
      };
    }

    let results: TFGoogleSearchFusionData[] = [];
    for (let i = 0; i < res.items.length; i++) {
      // Handle search duplication
      if (
        res.items[i].link in this.sourceMap ||
        EXCLUDE_EXTENSIONS.includes(res.items[i].link) // Cannot parse PDFs for now
      ) {
        logger.info("Skipping source", {
          link: res.items[i].link,
          reason: "Already in sources",
        });
        continue;
      }

      // Handle unsupported extensions
      let skipDueToExt = false;
      for (const ext of EXCLUDE_EXTENSIONS) {
        if (res.items[i].link.includes(ext)) {
          skipDueToExt = true;
          break;
        }
      }
      if (skipDueToExt) {
        logger.info("Skipping source", {
          link: res.items[i].link,
          reason: "In exclude extensions",
        });
        continue;
      }

      const content = await this.parseLinkToBriefSummary(
        res.items[i].link,
        query,
      );
      if (content !== "") {
        results.push({
          title: res.items[i].title,
          link: res.items[i].link,
          content,
        });

        if (results.length >= limit) {
          break;
        }
      }
    }

    logger.info("Finished searching Google", {
      query,
      resultsLength: results.length,
      results,
      model: "gemini-1.5-flash", // TODO: In the future, update this to be dynamic
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      inputTokensCost: 0.15,
      outputTokenCost: 0.6,
      totalCost: (this.inputTokens * 0.15) / 1000000 +
        (this.outputTokens * 0.6) / 1000000,
    });

    return {
      data: results || [],
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
    };
  }
}
