import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import * as middy from 'middy'
import { cors } from 'middy/middlewares'

import { getTodosbyId as getTodosbyId } from '../../helpers/todos'

// TODO: Get all TODO items for a current user
export const handler = middy(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // Write your code here
    const todoId = event.pathParameters.todoId
    const todo = await getTodosbyId(todoId)

    return { statusCode: 200, body: JSON.stringify({ item: todo }) }
  }
)

handler.use(
  cors({
    credentials: true
  })
)
