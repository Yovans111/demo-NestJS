import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity()
export class Chat {

    @PrimaryGeneratedColumn('uuid')
    id: number;

    @Column()
    email_id: string;

    @Column({ unique: true })
    text: string;

    @CreateDateColumn()
    created_at: Date;
}