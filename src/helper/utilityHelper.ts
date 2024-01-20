import { HttpException, HttpStatus } from "@nestjs/common"
import { RESPONSE_CODE } from "src/layout/auth/constant"

export const throwError = (message: string, statusCode: any = RESPONSE_CODE.BAD_REQUEST) => {
    throw new HttpException(message, statusCode)
}

export function response(res, data = {}, message = '', statusCode = HttpStatus.OK) {
    res.status(statusCode)
    res.json({
        statusCode,
        message,
        result: data,
    })
    res.end()
}