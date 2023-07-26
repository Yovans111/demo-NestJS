//(file cal => 1024 => 1kb -- 1024*1024 => 1mb -- 1024*1024*1024 => 1Gb)


export const responseUrl: string = `https://192.168.0.101/api`

export const jwtConstants = {
  secret: 'demo'
};

export const RESPONSE_CODE = {
  SUCCESS: 200,
  BAD_REQUEST: 400
}

export class ResponseData {
  message?: string;
  statusCode?: number;
  result?: any;
}

export const azureConfig = {
  connectionString: "endpoint=https://az-comm-svcs-4-apis.communication.azure.com/;accesskey=dX1zBVg8ezXQ2m5fzzLt7xWKmzs5HGOgR3etkIpJ9UZjQz58VJAEcepUaUwxyNEWYdheGMEPMRBql4PfqD4roA==",
  endpoint: 'https://az-comm-svcs-4-apis.communication.azure.com',
  accessTokentemp:'eyJhbGciOiJSUzI1NiIsImtpZCI6IjVFODQ4MjE0Qzc3MDczQUU1QzJCREU1Q0NENTQ0ODlEREYyQzRDODQiLCJ4NXQiOiJYb1NDRk1kd2M2NWNLOTVjelZSSW5kOHNUSVEiLCJ0eXAiOiJKV1QifQ.eyJza3lwZWlkIjoiYWNzOjRiYzY0MTQ2LWY5MjktNDU1ZC04NjEyLWVjMDQ2NzljYTNmNV8wMDAwMDAxYS0yYzhhLWQ5NzctNmEwYi0zNDNhMGQwMDRlYWIiLCJzY3AiOjE3OTIsImNzaSI6IjE2OTAyODIwNDciLCJleHAiOjE2OTAzNjg0NDcsInJnbiI6ImFtZXIiLCJhY3NTY29wZSI6InZvaXAiLCJyZXNvdXJjZUlkIjoiNGJjNjQxNDYtZjkyOS00NTVkLTg2MTItZWMwNDY3OWNhM2Y1IiwicmVzb3VyY2VMb2NhdGlvbiI6InVuaXRlZHN0YXRlcyIsImlhdCI6MTY5MDI4MjA0N30.TseVBvP-tGBtQvmmKeGlr2HGXS9t1ppKN2lSEzgoGTl3Wk_VQws6WdlvYRym6-RZgY4yLo7INUY1t0Qq37N_4inuZYsrfEAx7o5ptpRwmKMn_aWbTegawxuZa4SR8zT9EmJBsfTzkT5v8V4hReQxAz9ceP3WlOM9oGO1ZXeQBM4avYey0t1WQ4tv8zKW2lPwmnqiSil46i40ikOny-xxO6BNG1oi4-sZ16re-_f5KFHsEIupa3ZAKw0j7Ko8EMUx8DlHdHGNpJE2Af74F4DfAatDVqa7kMwRKkOiO4g1-3YKSK9oJ78RF1owWzUe9oeSrRcdk4NzOeRuGRSg_Kdp_g'
};