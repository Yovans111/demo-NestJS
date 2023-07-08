import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    email_id: string;

    @Column()
    password: string;

    @Column()
    age: number

    @Column()
    profile_img: string
}