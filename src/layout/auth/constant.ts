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
  endpoint: 'https://az-comm-svcs-4-apis.communication.azure.com/',
};