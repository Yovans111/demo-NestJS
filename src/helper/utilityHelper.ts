import { HttpException, HttpStatus } from "@nestjs/common"
import { Response } from "express"
import { RESPONSE_CODE } from "src/layout/auth/constant"

export const throwError = (message: string, statusCode: any = RESPONSE_CODE.BAD_REQUEST) => {
    throw new HttpException(message, statusCode)
}

export function response(res: Response, data = {}, message = '', statusCode = HttpStatus.OK) {
    res.status(statusCode)
    res.json({
        statusCode,
        message,
        result: data,
    })
    res.end()
}

export function getWhereCond(wh: any[]) {
    let res: any = {}
    if (Array.isArray(wh) && wh.length) {
        wh.forEach((a) => {
            res = {
                ...res, ...{ [a.colName]: { $regex: new RegExp(a?.value || '', 'i') } }
            }
        })
    }
    return res;
}
export function createPagination(limit, page, whereCond) {
    const pagination = {} as any;
    pagination.page = page || 1;
    pagination.limit = limit;
    pagination.whereCond = JSON.parse(whereCond || '[]')
    return pagination
}