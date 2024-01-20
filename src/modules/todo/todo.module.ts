import { Module } from '@nestjs/common';
import { TodoService } from './todo.service';
import { TodoController } from './todo.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { TodoList, TodoListSchema } from './schema/todo.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TodoList.name, schema: TodoListSchema, collection: 'todo_list' }]),
  ],
  controllers: [TodoController],
  providers: [TodoService]
})
export class TodoModule { }
