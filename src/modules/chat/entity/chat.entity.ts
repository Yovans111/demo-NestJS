import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity()
export class Chat {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    email_id: string;

    @Column()
    text: string;

    @CreateDateColumn()
    created_at: Date;
}