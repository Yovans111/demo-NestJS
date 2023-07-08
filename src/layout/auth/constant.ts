//(file cal => 1024 => 1kb -- 1024*1024 => 1mb -- 1024*1024*1024 => 1Gb)

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