import { HttpException, HttpStatus } from "@nestjs/common"
import { Response } from "express"
import { RESPONSE_CODE } from "src/layout/auth/constant"
import { whereCond } from "./response"

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

export function getWhereCond(wh: whereCond[], searchKey: string[]) {
    let res: any = {}
    if (Array.isArray(wh) && wh.length) {
        let $and: any[] = [], $or: any[] = [];
        wh.forEach((w: whereCond) => {
            if (w.colName == 'searchTerm') {
                searchKey.forEach((s) => {
                    $or.push({ [s]: { $regex: new RegExp(w?.value || '', 'i') } })
                })
            } else {
                $and.push({ [w.colName]: w.value });
            }
        })
        $or.length ? $and.push({ $or }) : null;
        res = { $and }
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