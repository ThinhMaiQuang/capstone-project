import * as React from 'react'
import { Form, Button, TextArea, Input, Image, Label } from 'semantic-ui-react'
import Auth from '../auth/Auth'
import {
  getUploadUrl,
  uploadFile,
  patchTodo,
  getTodo,
  createTodo
} from '../api/todos-api'
import dateFormat from 'dateformat'

enum UploadState {
  NoUpload,
  FetchingPresignedUrl,
  UploadingFile
}

interface EditTodoProps {
  match: {
    params: {
      todoId: string
    }
  }
  auth: Auth
}

interface EditTodoState {
  todo: any
  file: any
  uploadState: UploadState
  content: string
  mode: 'create' | 'edit'
  newTodoName: string
  tempFile: string
}

export class EditTodo extends React.PureComponent<
  EditTodoProps,
  EditTodoState
> {
  state: EditTodoState = {
    todo: { todoId: '' },
    file: undefined,
    uploadState: UploadState.NoUpload,
    content: '',
    newTodoName: '',
    mode: 'create',
    tempFile: 'https://static.thenounproject.com/png/3445536-200.png'
  }

  handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return
    this.setState({
      file: files[0]
    })
    // Encode the file using the FileReader API
    const reader = new FileReader()
    reader.onloadend = () => {
      this.setState({ tempFile: reader.result as string })
    }
    reader.readAsDataURL(files[0])
  }

  handleSubmit = async (event: React.SyntheticEvent) => {
    event.preventDefault()

    try {
      if (this.state.mode === 'create') {
        this.onTodoCreate()
      } else {
        this.onTodoEdit()
      }
    } catch (e) {
      alert('Could not habdle action: ' + (e as Error).message)
    } finally {
      this.setUploadState(UploadState.NoUpload)
    }
  }

  setUploadState(uploadState: UploadState) {
    this.setState({
      uploadState
    })
  }

  handleContentChange = (event: any) => {
    this.setState({ content: event.target.value })
  }

  handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ newTodoName: event.target.value })
  }

  async componentDidMount() {
    try {
      const todoId = this.props.match.params.todoId
      if (todoId !== '0') {
        const todo = await getTodo(this.props.auth.getIdToken(), todoId)
        this.setState({
          todo,
          mode: 'edit',
          tempFile: todo.attachmentUrl as string,
          newTodoName: todo.name,
          content: todo.content as string
        })
      } else {
        this.setState({
          mode: 'create'
        })
      }
    } catch (e) {
      alert(`Failed to fetch todos: ${(e as Error).message}`)
    }
  }

  render() {
    return (
      <div>
        <h1>Create new Post</h1>
        {this.renderInput()}
        {this.state.todo.attachmentUrl && (
          <label htmlFor="imgupload">
            <Image
              id="OpenImgUpload"
              src={this.state.tempFile}
              size="small"
              wrapped
            />
          </label>
        )}
        <Form onSubmit={this.handleSubmit}>
          <Form.Field>
            <input
              type="file"
              id="imgupload"
              accept="image/*"
              placeholder="Image to upload"
              style={{ display: 'none' }}
              onChange={this.handleFileChange}
            />
          </Form.Field>
          {this.renderTextArea()}
          {this.renderButton()}
        </Form>
      </div>
    )
  }

  renderInput() {
    return (
      <div>
        <Input
          style={{ width: '100%', paddingBottom: 10 }}
          placeholder="Title..."
          value={this.state.newTodoName}
          onChange={this.handleNameChange}
        />
      </div>
    )
  }

  renderButton() {
    return (
      <div style={{ paddingTop: 10 }}>
        {this.state.uploadState === UploadState.FetchingPresignedUrl && (
          <p>Updating To Do..</p>
        )}
        <Button
          loading={this.state.uploadState !== UploadState.NoUpload}
          type="submit"
        >
          Submit
        </Button>
      </div>
    )
  }

  renderTextArea() {
    return (
      <div>
        <TextArea
          placeholder="Content"
          style={{ minHeight: 100 }}
          value={this.state.content}
          onChange={this.handleContentChange}
        ></TextArea>
      </div>
    )
  }

  calculateDueDate(): string {
    const date = new Date()
    date.setDate(date.getDate() + 7)

    return dateFormat(date, 'yyyy-mm-dd') as string
  }

  onTodoCreate = async () => {
    if (!this.state.newTodoName || !this.state.content || !this.state.file) {
      alert('Please fill in all field')
      return
    }
    try {
      const dueDate = this.calculateDueDate()
      const newTodo = await createTodo(this.props.auth.getIdToken(), {
        name: this.state.newTodoName,
        dueDate,
        content: this.state.content
      })
      this.setUploadState(UploadState.FetchingPresignedUrl)
      const uploadUrl = await getUploadUrl(
        this.props.auth.getIdToken(),
        newTodo.todoId
      )
      if (newTodo && newTodo.todoId && newTodo.todoId !== '0') {
        const updateContent = await patchTodo(
          this.props.auth.getIdToken(),
          newTodo.todoId,
          {
            name: newTodo.name,
            dueDate: newTodo.dueDate,
            done: newTodo.done,
            content: this.state.content,
            numberOfLike: ''
          }
        )
        this.setUploadState(UploadState.UploadingFile)
        await uploadFile(uploadUrl, this.state.file)
      }
    } catch {
      alert('Todo creation failed')
    }
  }

  onTodoEdit = async () => {
    try {
      const updateContent = await patchTodo(
        this.props.auth.getIdToken(),
        this.state.todo.todoId,
        {
          name: this.state.newTodoName,
          dueDate: this.state.todo.dueDate,
          content: this.state.content,
          done: this.state.todo.done,
          numberOfLike: this.state.todo.numberOfLike || ''
        }
      )

      if (this.state.file) {
        this.setUploadState(UploadState.FetchingPresignedUrl)

        const uploadUrl = await getUploadUrl(
          this.props.auth.getIdToken(),
          this.state.todo.todoId
        )
        this.setUploadState(UploadState.UploadingFile)
        await uploadFile(uploadUrl, this.state.file)
      }
    } catch {
      alert('Todo Edit failed')
    }
  }
}
