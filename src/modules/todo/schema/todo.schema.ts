import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import * as mongoose from "mongoose";

export type TodoListDocument = TodoList & mongoose.Document;

@Schema()
export class TodoList {

    @Prop()
    title: string;

    @Prop()
    dueDate: Date;

    @Prop()
    taskId: string;

    @Prop()
    priority: number;

    @Prop()
    description: string;

    @Prop()
    status: number;

    @Prop({ default: () => 0 })
    createdBy: number;

    @Prop({ required: true, default: () => new Date() })
    createdAt: Date;
}

export const TodoListSchema = SchemaFactory.createForClass(TodoList);
