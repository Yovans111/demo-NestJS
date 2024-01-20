import { Injectable } from '@nestjs/common';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { InjectModel } from '@nestjs/mongoose';
import { TodoList, TodoListDocument } from './schema/todo.schema';
import { Model } from 'mongoose';

@Injectable()
export class TodoService {

  constructor(
    @InjectModel(TodoList.name) private todoListModel: Model<TodoListDocument>,
  ) { }

  create(data: CreateTodoDto) {
    return this.todoListModel.create(data);
  }

  findAll() {
    return `This action returns all todo`;
  }

  findOne(id: number) {
    return `This action returns a #${id} todo`;
  }

  update(id: number, updateTodoDto: UpdateTodoDto) {
    return `This action updates a #${id} todo`;
  }

  remove(id: number) {
    return `This action removes a #${id} todo`;
  }
}
