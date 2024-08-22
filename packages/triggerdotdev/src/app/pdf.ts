import { logger } from "@trigger.dev/sdk/v3";
import mdToPdf from "md-to-pdf";

export class PdfConverter {
  mdContent: string;
  constructor(mdContent: string) {
    this.mdContent = mdContent;
  }

  async convert() {
    logger.info("Converting markdown to pdf");
    try {
      const pdf = await mdToPdf({ content: this.mdContent });

      if (pdf) {
        return pdf;
      }
    } catch (e: any) {
      console.log(e);
      logger.error(e.message);
    }
  }
}
