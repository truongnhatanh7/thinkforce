import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { TRIGGER_PROJECT_NAME } from "../../trigger.config";
import { envvars, logger } from "@trigger.dev/sdk/v3";

export class UploadEngine {
  constructor() {}

  async newS3Client(): Promise<S3Client> {
    const endpoint = await envvars.retrieve(
      TRIGGER_PROJECT_NAME,
      "dev",
      "CLOUDFLARE_R2_ENDPOINT"
    );

    const accessKeyId = await envvars.retrieve(
      TRIGGER_PROJECT_NAME,
      "dev",
      "CLOUDFLARE_R2_ACCESS_KEY_ID"
    );

    const secretAccessKey = await envvars.retrieve(
      TRIGGER_PROJECT_NAME,
      "dev",
      "CLOUDFLARE_R2_SECRET_ACCESS_KEY"
    );

    return new S3Client({
      region: "auto",
      endpoint: endpoint.value,
      credentials: {
        accessKeyId: accessKeyId.value,
        secretAccessKey: secretAccessKey.value,
      },
    });
  }

  async uploadToR2(
    userId: string,
    topic: string,
    article: string,
    prefix = "",
    ext = "md"
  ) {
    // Replace topic / with _ -> break paths
    topic = topic.replaceAll("/", "_");

    const s3Client = await this.newS3Client();
    logger.info("Init s3 client");
    const createdAt = new Date().getTime().toString();
    const fileName = `${userId}/${prefix}${topic.replaceAll(
      "_",
      ""
    )}_${createdAt}.${ext}`;
    // Convert article to md
    const putObjectCommand = new PutObjectCommand({
      Bucket: "hyper-document",
      Key: fileName,
      Body: article,
      Metadata: {
        topic: topic,
        created_at: createdAt,
      },
    });
    await s3Client.send(putObjectCommand);
    logger.info("uploaded", {
      fileName: fileName,
    });

    return fileName;
  }
}
