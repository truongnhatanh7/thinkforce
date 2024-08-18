import { envvars, logger } from "@trigger.dev/sdk/v3";
import Exa, { SearchResponse as ExaSearchResponse } from "exa-js";
import { SearchEngine, SearchResultItem, SearchResults } from "./search";

export class ExaSearch extends SearchEngine {
  constructor() {
    super();
  }

  private mapExaToSearchResults(
    exaResults: ExaSearchResponse<{
      type: string;
      numResults: number;
      highlights: true;
      text: {
        maxCharacters: number;
      };
      category: string;
    }>,
  ): SearchResultItem[] {
    const res = exaResults.results.map((res) => {
      return {
        title: res.title,
        link: res.url,
        content: `
        Summary: ${res.text}
        Key highlights: ${res.highlights}
        `,
      } as SearchResultItem;
    });
    return res;
  }

  async search(
    query: string,
    _topic: string,
    limit = 3,
  ): Promise<SearchResults> {
    const exaKey = await envvars.retrieve("EXA_KEY");

    const exa = new Exa(exaKey.value);
    const result = await exa.searchAndContents(
      query,
      {
        type: "keyword",
        numResults: limit,
        highlights: true,
        text: {
          maxCharacters: 200,
        },
        category: "research paper",
      },
    );

    logger.info("Exa search result", result);

    return {
      costInUsd: 0.01,
      results: this.mapExaToSearchResults(result),
    };
  }
}
