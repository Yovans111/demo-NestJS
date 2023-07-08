import { HttpStatus, Injectable } from '@nestjs/common';
import { ReturnAllUser, userData } from './user-dto.dto';
import { User } from './entity/user.entity';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Connection } from 'mysql2/typings/mysql/lib/Connection';

@Injectable()
export class UserService {

    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectDataSource() private dataSource: DataSource
    ) { }
    async getUserData(): Promise<ReturnAllUser> {
        const d = await this.usersRepository.find();
        d.map((a: User) => {
            delete a.password
            return a
        })
        return { result: d, statusCode: HttpStatus.OK, message: 'success' }
    }

    saveData(data: userData) {
        if (data?.id) {
            return this.usersRepository.update(data?.id, data);
        } else {
            return this.usersRepository.save(data);
        }
    }
    
    async getById(id: any): Promise<User | any> {
        // const q = await this.dataSource.query('SELECT user.id , user.name ,user.email_id,user.age  FROM `demo`.`user` as user WHERE user.id = 1 ')
        const d = await this.usersRepository.findOneBy(id);
        delete d.password
        return d
    }
}
