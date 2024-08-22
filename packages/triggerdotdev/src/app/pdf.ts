import { logger } from "@trigger.dev/sdk/v3";
import mdToPdf from "md-to-pdf";

export class PdfConverter {
  mdContent: string;
  constructor(mdContent: string) {
    this.mdContent = mdContent;
  }

  async convert() {
    logger.info("Converting markdown to pdf");
    const pdf = await mdToPdf({ content: this.mdContent }).catch((err) => {
      // Non retry able error
      logger.error(err);
    });

    if (pdf) {
      return pdf;
    }
  }
}
