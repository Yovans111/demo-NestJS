import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/modules/user/entity/user.entity';
import { Repository } from 'typeorm';
import { logInReturnData } from './dto/auth.dto';

@Injectable()
export class AuthService {

    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        private jwtService: JwtService
    ) { }

    async login(request: any) {
        const data = await this.usersRepository.findOne({ where: { email_id: request?.email_id } })
        if (data) {
            if (data.password == request?.password) {
                const token = await this.loginTokenGenerate(data)
                data['token'] = token.access_token
                //@ts-ignore
                return { status: 'sucess', statusCode: 200, data: data }
            } else {
                return { status: 'Bad Credential', statusCode: 400, message: 'Password is Incorrect' }
            }
        } else {
            return { status: 'Bad Credential', statusCode: 400, message: 'Invalid Data' }
        }
    }

    async loginTokenGenerate(user: any) {
        const payload = { email_id: user.email_id, password: user.password };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
}
