import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/modules/user/entity/user.entity';
import { Repository } from 'typeorm';
import { logInReturnData } from './dto/auth.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class AuthService {

    constructor(
        @Inject(CACHE_MANAGER) private cacheManager,
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        private jwtService: JwtService
    ) { }

    async login(request: any) {
        // console.log('login',request)
        const data = await this.usersRepository.findOne({ where: { email_id: request?.email_id } })
        if (data) {
            if (data.password == request?.password) {
                const token = await this.loginTokenGenerate(data)
                data['token'] = token.access_token
                if(data.password){
                    delete data.password
                }
                await this.cacheManager.set(data.email_id, token.access_token, { ttl: process.env.JWT_EXPIRATION || 604800 });
                //@ts-ignore
                return { status: 'sucess', statusCode: 200, result: data }
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
