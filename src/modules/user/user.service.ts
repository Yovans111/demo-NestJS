import { Injectable } from '@nestjs/common';
import { userData } from './user-dto.dto';
import { User } from './entity/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {

    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) { }
    async getUserData(): Promise<User[]> {
        const d = await this.usersRepository.find();
        d.map((a: User) => {
            delete a.password
            return a
        })
        return d
    }

    saveData(data: userData) {
        if (data?.id) {
            return this.usersRepository.update(data?.id, data);
        } else {
            return this.usersRepository.save(data);
        }
    }
    async getById(id: any): Promise<User | any> {
        const d = await this.usersRepository.findOneBy(id);
        delete d.password
        return d
    }
}
