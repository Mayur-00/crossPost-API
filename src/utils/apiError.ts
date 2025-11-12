class ApiError extends Error implements IApiError {
  statusCode: number;
  message: string;
  data: any | null;
  success: boolean;
  errors: any[];

  constructor(
    statusCode: number,
    message = "Something Went wrong",
    error: any[] = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.data = null;
    this.success = false;
    this.errors = error;

    if (stack) {
      this.stack = stack;
    } else if (typeof (Error as any).captureStackTrace === "function") {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

interface IApiError {
  statusCode: number;
  message: string;
  data: any | null;
  success: boolean;
  errors: any[];
  stack?:string | undefined
}

export { ApiError, IApiError };
