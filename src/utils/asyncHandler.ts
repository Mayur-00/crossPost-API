import { Request, Response, NextFunction } from 'express';

interface RequestHandler {
  (req: Request, res: Response, next: NextFunction): Promise<any> | any;
}

interface AsyncRequestHandler {
  (req: Request, res: Response, next: NextFunction): void;
}

const asyncHandler = (requestHandler: RequestHandler): AsyncRequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
