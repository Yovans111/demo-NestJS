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
    status: number; //1 => Incomplete , 2=> Inprogress ,3 =>To-do , 4=>Completed , 5=> Canceled  

    @Prop({ default: () => 0 })
    createdBy: number;

    @Prop({ default: () => 0 })
    isFavorite: number; //0 => false 1 => true

    @Prop({ default: () => 0 })
    isComplete: number; //0 => false 1 => true

    @Prop({ required: false, default: () => null })
    completedAt: Date;

    @Prop({ required: true, default: () => new Date() })
    createdAt: Date;
}

export const TodoListSchema = SchemaFactory.createForClass(TodoList);
