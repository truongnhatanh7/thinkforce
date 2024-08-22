import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { envvars, logger } from "@trigger.dev/sdk/v3";

export class UploadEngine {
  constructor() {}

  async newS3Client(): Promise<S3Client> {
    const endpoint = await envvars.retrieve(
      "CLOUDFLARE_R2_ENDPOINT",
    );

    const accessKeyId = await envvars.retrieve(
      "CLOUDFLARE_R2_ACCESS_KEY_ID",
    );

    const secretAccessKey = await envvars.retrieve(
      "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
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
    runId: string,
    userId: string,
    article: string | Buffer,
    prefix = "",
    ext = "md",
  ) {
    const s3Client = await this.newS3Client();
    logger.info("Init s3 client");

    const createdAt = new Date().getTime().toString();
    const fileName = `${userId}/${prefix}${runId}.${ext}`;

    const putObjectCommand = new PutObjectCommand({
      Bucket: "hyper-document",
      Key: fileName,
      Body: article,
      Metadata: {
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
