import { TodosAccess } from './todosAcess'
import { TodoItem } from '../models/TodoItem'
import { CreateTodoRequest } from '../requests/CreateTodoRequest'
import { UpdateTodoRequest } from '../requests/UpdateTodoRequest'
// import { createLogger } from '../utils/logger'
import * as uuid from 'uuid'
// import * as createError from 'http-errors'

const todoAccess = new TodosAccess()
// TODO: Implement businessLogic
export async function createTodo(
  req: CreateTodoRequest,
  user: string
): Promise<TodoItem> {
  let newTodo = null
  if (req) {
    const newToDoId = uuid.v4()
    newTodo = {
      userId: user,
      todoId: newToDoId,
      createdAt: new Date().toISOString,
      done: false,
      attachmentUrl: null,
      name: req.name,
      dueDate: req.dueDate
    }

    return todoAccess.createTodo(newTodo)
  }
  return null
}

export async function createAttachmentPresignedUrl(
  userId: string,
  todoId: string
): Promise<string> {
  const attachmentId = uuid.v4()
  return await todoAccess.createPresignedUrl(userId, todoId, attachmentId)
}

export async function getTodosForUser(userId: string): Promise<TodoItem[]> {
  return await todoAccess.getUserTodo(userId)
}

export async function updateTodo(
  userId: string,
  todoId: string,
  req: UpdateTodoRequest
) {
  await todoAccess.updateTodo(userId, todoId, req)
}

export async function deleteTodo(todoId: string, userId: string) {
  todoAccess.deleteTodo(todoId, userId)
}
