import { ApiProperty } from "@nestjs/swagger"
import { IsString, IsEmail, IsNumber, IsOptional, IsDate } from "class-validator"
import { User } from "./entity/user.entity"

export class userData {
    @ApiProperty()
    @IsString()
    name: string

    @ApiProperty()
    @IsEmail()
    email_id: string

    // @ApiProperty()
    // @IsString()
    // password: string

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    age?: number

    // @ApiProperty({required:false})
    // // @IsDate()
    // @IsOptional()
    // dob?: string

    @ApiProperty({ required: false, description: 'For Update Only' })
    @IsOptional()
    id: number
}


export class ReturnAllUser {
    result: User[];
    statusCode: number;
    message: string
}

