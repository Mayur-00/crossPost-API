import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export class jwtToken {
 static generateRefreshToken = (id: string) => {
    if (!process.env.REFRESH_TOKEN_SECRET) {
      throw new Error(
        "REFRESH_TOKEN_SECRET is not defined in environment variables"
      );
    }
    return jwt.sign({ id: id }, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: "20d",
    });
  };

 static generateAccessToken = (id: string, email: string, name: string) => {
    if (!process.env.ACCESS_TOKEN_SECRET) {
      throw new Error(
        "ACCESS_TOKEN_SECRET is not defined in environment variables"
      );
    }

    return jwt.sign(
      {
        id: id,
        name: name,
        email: email,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "7d",
      }
    );
  };


}
