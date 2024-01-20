import { Injectable } from '@nestjs/common';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { InjectModel } from '@nestjs/mongoose';
import { TodoList, TodoListDocument } from './schema/todo.schema';
import { Model } from 'mongoose';
import { response, throwError } from 'src/helper/utilityHelper';
import { Response } from 'express';

@Injectable()
export class TodoService {

  constructor(
    @InjectModel(TodoList.name) private todoListModel: Model<TodoListDocument>,
  ) { }

  async create(req: CreateTodoDto, res: Response) {
    let data: any = {} as TodoList;
    data.status = 1;
    data.taskId = await this.generateOrderId()
    data = { ...data, ...req }
    try {
      const result = await this.todoListModel.create(data);
      response(res, result, 'Task Save Successfully')
    } catch (error) {
      throwError(error)
    }

  }

  async findAll(res) {
    const result = await this.todoListModel.find({}).sort({ 'createdAt': -1 })
    response(res, result, 'success');
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

  async generateOrderId() {
    const last = await this.todoListModel.findOne({}, {}, { sort: { 'taskId': -1 } });

    let counter: any = 1;
    if (last && last.taskId) {
      const lastNumber = parseInt(last.taskId.slice(3), 10);
      if (!isNaN(lastNumber)) {
        counter = lastNumber + 1;
      }
    }
    if (counter.toString().length < 4) {
      counter = counter.toString().padStart(4, '1000')
    }
    return `TAS${counter}`;
  }

}
