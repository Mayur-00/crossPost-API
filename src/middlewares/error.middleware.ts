import { Request, Response, NextFunction } from "express";
import { ApiError, IApiError } from "../utils/apiError";





export const handleError = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.log(err);
    let error: IApiError | ApiError | any = err;

    const IsInDevelopment = process.env.NODE_ENV === "development";

    if (!(error instanceof ApiError)) {
        const statusCode = (error && error.statusCode) ? error.statusCode : 500;
        const message = (error && error.message) ? error.message : "Something Went Wrong";
        error = new ApiError(statusCode, message, (error && error.errors) || [], (error && error.stack) || undefined);
    }

    const response: ResponseType = {
        success: false,
        message: error.message,
        errors: error.errors || [],
        stack: undefined
    };

    if (IsInDevelopment) response.stack = error.stack;

    res.status(error.statusCode || 500).json(response);
};



export type ResponseType = {
    success:boolean;
    message:string;
    data?:{}
    errors:any[];
    stack?:string
}