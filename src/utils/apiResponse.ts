interface IApiResponse {
  statusCode: number;
  data: any;
  message: string;
  success: boolean;
}

export class ApiResponse implements IApiResponse {
  statusCode: number;
  data: any;
  message: string;
  success: boolean;

  constructor(statusCode: number, data: any, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}
