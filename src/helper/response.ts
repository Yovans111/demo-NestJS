export interface whereCond {
    colName: string,
    value: any,
    operation?: 'AND' | 'OR' | 'IN',
    alias?: string
}
