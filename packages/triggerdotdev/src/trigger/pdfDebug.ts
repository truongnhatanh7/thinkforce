import { task } from "@trigger.dev/sdk/v3";
import { StormOutlineGen } from "../app/outline";
import { SearchResultItem } from "../app/search";
import { PdfConverter } from "../app/pdf";
import { mockMd } from "../mocks/mockMd";

export const pdfDebug = task({
  id: "pdfDebug",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 1000 * 60 * 15,
    factor: 2,
    randomize: true,
  },
  queue: {
    name: "pdfDebug",
    concurrencyLimit: 10,
  },
  machine: {
    preset: "small-1x",
  },
  run: async () => {
    const pdfConverter = new PdfConverter(mockMd);
    await pdfConverter.convert();
  },
});
