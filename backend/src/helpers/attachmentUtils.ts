import * as AWS from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'

const XAWS = AWSXRay.captureAWS(AWS)

// TODO: Implement the fileStogare logic
export class AttachmentUtils {
  private s3Bucket: string = process.env.ATTACHMENT_S3_BUCKET
  private expires: number = parseInt(process.env.SIGNED_URL_EXPIRATION)
  private s3
  constructor() {
    this.s3 = new XAWS.S3({ signatureVersion: 'v4' })
  }
  public async createAttachmentPresignedUrl(
    attachmentId: string
  ): Promise<string> {
    return this.s3.getSignedUrl('putObject', {
      Bucket: this.s3Bucket,
      Key: attachmentId,
      Expires: this.expires
    }) as string
  }
}
