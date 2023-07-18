import * as AWS from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { createLogger } from '../utils/logger'
import { TodoItem } from '../models/TodoItem'
import { TodoUpdate } from '../models/TodoUpdate'
import { AttachmentUtils } from './attachmentUtils'

const XAWS = AWSXRay.captureAWS(AWS)

const logger = createLogger('TodosAccess')

// TODO: Implement the dataLayer logic
export class TodosAccess {
  private table: string = process.env.TODOS_TABLE
  // private createdAtIndex: string = process.env.TODOS_CREATED_AT_INDEX
  private s3Bucket = process.env.ATTACHMENT_S3_BUCKET

  private document: DocumentClient

  constructor() {
    this.document = new XAWS.DynamoDB.DocumentClient()
  }

  public async createTodo(item: TodoItem): Promise<TodoItem> {
    if (!item) {
      logger.error('Cannot Create, todo is not exist!')
    }

    logger.info('Create toto item:')

    await this.document
      .put({
        TableName: this.table,
        Item: item
      })
      .promise()

    logger.info(`Create done with result: ${item}`)

    return item
  }

  public async createPresignedUrl(
    userId: string,
    todoId: string,
    attachmentId: string
  ) {
    const attachmentUtil = new AttachmentUtils()
    const attachmentUrl = `https://${this.s3Bucket}.s3.amazonaws.com/${attachmentId}`

    if (userId) {
      await this.document
        .update({
          TableName: this.table,
          Key: {
            todoId,
            userId
          },
          UpdateExpression: 'set #attachmentUrl = :attachmentUrl',
          ExpressionAttributeNames: {
            '#attachmentUrl': 'attachmentUrl'
          },
          ExpressionAttributeValues: {
            ':attachmentUrl': attachmentUrl
          }
        })
        .promise()

      logger.info(
        `${await attachmentUtil.createAttachmentPresignedUrl(attachmentId)}`
      )

      return await attachmentUtil.createAttachmentPresignedUrl(attachmentId)
    } else {
      logger.error('Create URL failed')
    }
  }

  public async getUserTodo(userId: string): Promise<TodoItem[]> {
    try {
      const result = await this.document
        .query({
          TableName: this.table,
          KeyConditionExpression: '#userId = :userId',
          ExpressionAttributeNames: {
            '#userId': 'userId'
          },
          ExpressionAttributeValues: {
            ':userId': userId
          }
        })
        .promise()
      logger.info('Success - Fetched todo list items for user ', userId)
      return result.Items as TodoItem[]
    } catch (err) {
      logger.error('Error', err.stack)
      return []
    }
  }

  public async updateTodo(userId: string, todoId: string, req: TodoUpdate) {
    if (!userId) {
      logger.error(`User ${userId} is not exists`)
    } else {
      logger.info(`Start update todo id: ${todoId}`)

      await this.document
        .update({
          TableName: this.table,
          Key: {
            todoId,
            userId
          },
          UpdateExpression:
            'set #name = :name, #dueDate = :dueDate, #done = :done',
          ExpressionAttributeNames: {
            '#name': 'name',
            '#dueDate': 'dueDate',
            '#done': 'done'
          },
          ExpressionAttributeValues: {
            ':name': req.name,
            ':dueDate': req.dueDate,
            ':done': req.done
          }
        })
        .promise()

      logger.info('Updated success ', req)
    }
  }

  public async deleteTodo(todoId: string, userId: string) {
    try {
      logger.info('Start delete todo id ' + todoId)
      const data = this.document
        .delete({
          Key: {
            todoId,
            userId
          },
          TableName: this.table
        })
        .promise()
      logger.info('Delete success ', data)
    } catch (err) {
      logger.error('Error', err.stack)
    }
  }
}
