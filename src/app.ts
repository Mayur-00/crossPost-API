import express, {Request, Response} from 'express';
export const app = express();
import dotenv from "dotenv"
dotenv.config();


app.get("/", (req:Request, res:Response)=> {
    res.send(`fuck you `)

});

