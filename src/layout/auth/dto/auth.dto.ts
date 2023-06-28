import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsOptional, IsString } from "class-validator"
import { userData } from "src/modules/user/user-dto.dto"

export class logInData {

    @ApiProperty()
    @IsEmail()
    email_id: string

    @ApiProperty()
    @IsString()
    password: any

}

export class logInReturnData extends userData {
    
    @ApiProperty()
    @IsOptional()
    token:any
}