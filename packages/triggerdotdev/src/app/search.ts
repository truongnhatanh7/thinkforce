export interface SearchResults {
  costInUsd: number;
  results: SearchResultItem[];
}

export interface SearchResultItem {
  title: string;
  link: string;
  content: string;
}

export abstract class SearchEngine {
  abstract search(
    query: string,
    topic: string,
    limit: number,
  ): Promise<SearchResults>;
}
