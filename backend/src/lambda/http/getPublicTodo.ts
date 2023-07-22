import 'source-map-support/register'

import { APIGatewayProxyResult } from 'aws-lambda'
import * as middy from 'middy'
import { cors } from 'middy/middlewares'

import { getPublicTodo as getPublicTodo } from '../../helpers/todos'

// TODO: Get all TODO items for a current user
export const handler = middy(async (): Promise<APIGatewayProxyResult> => {
  // Write your code here
  const todoList = await getPublicTodo()

  return { statusCode: 200, body: JSON.stringify({ items: todoList }) }
})

handler.use(
  cors({
    credentials: true
  })
)
