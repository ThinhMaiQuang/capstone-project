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

  public async deleteAttachment(attachmentId: string) {
    const attachmentUtil = new AttachmentUtils()
    if (!attachmentId) {
      logger.info(`Unable to delete attachment: ${attachmentId}`)
      return
    }
    return await attachmentUtil.deteleAttachment(attachmentId)
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

  public async getTodoById(todoId: string): Promise<TodoItem> {
    logger.info(`Fetched todo id ${todoId} `)
    try {
      const result = await this.document
        .scan({
          TableName: this.table,
          FilterExpression: 'attribute_exists(userId) AND todoId = :todoId',
          ExpressionAttributeValues: {
            ':todoId': todoId
          }
        })
        .promise()
      logger.info(`Success - Fetched todo id ${result} `)
      return result.Items[0] as TodoItem
    } catch (err) {
      logger.error(`Error ${err.stack}`)
      return { todoId: null } as TodoItem
    }
  }

  public async getPublicTodo(): Promise<TodoItem[]> {
    logger.info(`Fetched public Todo `)
    try {
      const result = await this.document
        .scan({
          TableName: this.table,
          FilterExpression: 'attribute_exists(userId) AND done = true'
        })
        .promise()
      logger.info(`Success - Fetched todo id ${result} `)
      return result.Items as TodoItem[]
    } catch (err) {
      logger.error(`Error ${err.stack}`)
      return [] as TodoItem[]
    }
  }

  public async updateTodo(userId: string, todoId: string, req: TodoUpdate) {
    if (!userId) {
      logger.error(`User ${userId} is not exists`)
    } else {
      logger.info(`Start update todo id: ${todoId}`)
      try {
        await this.document
          .update({
            TableName: this.table,
            Key: {
              todoId,
              userId
            },
            UpdateExpression:
              'set #name = :name, #dueDate = :dueDate, #done = :done, #content = :content, #numberOfLike = :numberOfLike',
            ExpressionAttributeNames: {
              '#name': 'name',
              '#dueDate': 'dueDate',
              '#done': 'done',
              '#content': 'content',
              '#numberOfLike': 'numberOfLike'
            },
            ExpressionAttributeValues: {
              ':name': req.name,
              ':dueDate': req.dueDate,
              ':done': req.done,
              ':content': req.content,
              ':numberOfLike': req.numberOfLike
            }
          })
          .promise()

        logger.info('Updated success ', req)
      } catch (error) {
        logger.info(`Updated false with error ${error} `)
      }
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
