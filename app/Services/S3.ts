import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import Env from '@ioc:Adonis/Core/Env'
import fs from 'fs'

const S3 = new S3Client({
  apiVersion: 'latest',
  region: Env.get('S3_REGION', 'us-east-1'),
  endpoint: Env.get('S3_ENDPOINT'),
  forcePathStyle: true,
  credentials: {
    accessKeyId: Env.get('S3_ACCESS_KEY'),
    secretAccessKey: Env.get('S3_SECRET_KEY'),
  },
})

export default class S3Control {
  private static _bucket = Env.get('S3_BUCKET', 'utises')

  public static async uploadProduct(fileName: string, path: string) {
    await S3.send(
      new PutObjectCommand({
        Bucket: this._bucket,
        Key: 'product-files/' + fileName,
        Body: fs.createReadStream(path),
      })
    )
  }

  public static async uploadProductImage(fileName: string, path: string) {
    await S3.send(
      new PutObjectCommand({
        Bucket: this._bucket,
        Key: 'product-images/' + fileName,
        Body: fs.createReadStream(path),
        ACL: 'public-read',
      })
    )
  }

  public static async getDownloadUrl(key: string) {
    return await getSignedUrl(
      S3,
      new GetObjectCommand({ Key: 'product-files/' + key, Bucket: this._bucket }),
      { expiresIn: 60 * 60 * 24 }
    )
  }

  public static async deleteProduct(key: string) {
    await S3.send(new DeleteObjectCommand({ Key: 'product-files/' + key, Bucket: this._bucket }))
  }

  public static async deleteProductImage(key: string) {
    await S3.send(new DeleteObjectCommand({ Bucket: this._bucket, Key: 'product-images/' + key }))
  }
}
