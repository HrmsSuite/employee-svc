import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { s3 } from "../common/config/S3-upload";
import "multer";
export const uploadToS3 = async (
  file: Express.Multer.File,
  folder: string = "documents",
): Promise<string> => {
  const key = `${folder}/${uuidv4()}-${file.originalname}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );

  return key
};
