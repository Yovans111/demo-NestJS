import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { jwtConstants } from './constant';
import { JwtStrategy } from './jwt.strategy';
import { User } from 'src/modules/user/entity/user.entity';
import { CacheModule } from '@nestjs/cache-manager';


@Module({
    imports: [
        // TypeOrmModule.forFeature([User]),CacheModule.register(),
        JwtModule.register({
            secret: jwtConstants.secret,
            signOptions: { expiresIn: '2h' },
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService,JwtStrategy],
    exports:[AuthService]
})
export class AuthModule { }