import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { UserService } from './user/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user/entity/user.entity';
import { RouterModule, Routes } from '@nestjs/core';

const Route: Routes = [
    {
        path: 'api/' + 'user',
        module: UserModule
    },
]
@Module({
    imports: [UserModule, TypeOrmModule.forFeature([User]),
        RouterModule.register(Route)
    ],
})
export class ModulesModule { }

