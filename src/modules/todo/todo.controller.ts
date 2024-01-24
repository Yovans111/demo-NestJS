import { Controller, Get, Post, Body, Patch, Param, Delete, Res, Query } from '@nestjs/common';
import { TodoService } from './todo.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { Response } from 'express';
import { Appconstant } from 'src/layout/auth/constant';
import { createPagination } from 'src/helper/utilityHelper';

@Controller()
export class TodoController {
  constructor(private readonly todoService: TodoService) { }

  @Post('save')
  create(@Body() data: any, @Res() res: Response) {
    return this.todoService.create(data, res);
  }

  @Get('getlist')
  findAll(@Res() res: Response, @Query('page') page: number, @Query('limit') limit: number = Appconstant.LIST_LIMIT, @Query('whereCond') whereCond: string) {
    const query = createPagination(limit, page, whereCond);
    return this.todoService.findAll(res, query);
  }

  @Post('updateData')
  updateData(@Body() req: any, @Res() res: Response) {
    return this.todoService.updateData(res, req);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTodoDto: UpdateTodoDto) {
    return this.todoService.update(+id, updateTodoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.todoService.remove(+id);
  }
}
