import { RequestHandler, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { jwtToken } from "../services/jwtCookie.service";
import { LinkedinAccountServices } from "../services/linkedinAccount.services";
import { createPostDatabseRecord } from "../utils/createPostDbRecord";
import { ApiResponse } from "../utils/apiResponse";
import { uploadImageToCloudinary } from "../utils/imageUploader";
import logger from "../config/logger.config";

export const ConnectLinkedin: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { code, state, error } = req.query as {
      code: string;
      state: string;
      error: string;
    };
    const FRONTEND_URI = process.env.FRONTEND_URI;
    if (!code) {
      throw new ApiError(401, "code not provided");
    }

    const tokenResponse = jwtToken.verifyAccessToken(state);

    if (!tokenResponse.success) {
      res.redirect(`${FRONTEND_URI}/error?message=${tokenResponse.error}`); //TODO: change message to a default message in production
    }

    const accessTokenResponse =
      await LinkedinAccountServices.getAccessToken(code);

    if (!accessTokenResponse.success) {
      throw new ApiError(500, accessTokenResponse.error);
    }
    const accessToken = accessTokenResponse.response?.access_token;

    const getUserInfoResponse = await LinkedinAccountServices.getUserInfo(
      accessToken!
    );

    if (!getUserInfoResponse.success) {
      res.redirect(
        `${FRONTEND_URI}/error?message=${getUserInfoResponse.error}`
      );
    }
    const databaseRecord = await LinkedinAccountServices.createDatabseRecord(
      getUserInfoResponse.data!,
      accessTokenResponse.response!,
      tokenResponse.id!
    );

    if (!databaseRecord.success) {
      res.redirect(`${FRONTEND_URI}/error?message=${databaseRecord.error}`); //TODO:
    }

    res.redirect(`${FRONTEND_URI}/home`);
  }
);

export const postLinkedin: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { text, file } = req.body;

    const image = req.file;

    if (!req.user) {
      throw new ApiError(401, "unauthorized");
    }

    if (!text) {
      throw new ApiError(400, "text not provided");
    }

    // getting user's linkedin account info

    const accountServiceResponse =
      await LinkedinAccountServices.getUsersLinkedinAccount(req.user.id);

    if (!accountServiceResponse.success) {
      logger.error(accountServiceResponse.error)

      throw new ApiError(500, "service failed");
    }

    const accountData = accountServiceResponse.data!;
    let resData;
    let imageUrl;

    // if user uploaded any image then upload post with image flow else only text image upload
    if (image) {
      // first task is to register image upload  using registerImageUpload method

      const registerImageResponse =
        await LinkedinAccountServices.registerImageUpload(
          accountData.access_token,
          accountData.platform_userid
        );

      if (!registerImageResponse.success) {
        logger.error(registerImageResponse.error);
        throw new ApiError(500, "failure");
      }

      // after image registeration the second thing is do is upload image binary

      const uploadImageBinaryResponse =
        await LinkedinAccountServices.uploadImageBinary(
          registerImageResponse.uploadUrl,
          image.buffer,
          accountData.access_token
        );

      if (!uploadImageBinaryResponse.success) {
        logger.error(uploadImageBinaryResponse.error)
        throw new ApiError(500, "failure");
      }

      // after the successfull image binary upload, the third task is to create and upload post to linkedin api
      resData = await LinkedinAccountServices.uploadPostWithMedia(
        registerImageResponse.asset,
        accountData.access_token,
        accountData.platform_userid,
        text
      );

      console.log(resData)
      if (!uploadImageBinaryResponse.success) {
          logger.error(uploadImageBinaryResponse.error)
        throw new ApiError(500, "failure");
      }

      imageUrl = (await uploadImageToCloudinary(image)).secure_url;
    } else {
      // creating and uploading textonly post to linkedin
      resData = await LinkedinAccountServices.createTextPost(
        accountData?.platform_userid,
        text,
        accountData?.access_token
      );
      imageUrl =''

      if (!resData.success) {
        logger.error(resData.error)
        throw new ApiError(500, "post service failed");
      }
    }
    // creating post record
    const dbPost = await createPostDatabseRecord(req.user.id, text, imageUrl);

    if (!dbPost.success) {
      logger.error(dbPost.error)
      throw new ApiError(500, "service failed");
    }

    // creating linkedinPost Record
    const linkedinPostDbRecord =
      await LinkedinAccountServices.createPostDbRecord(
        req.user.id,
        dbPost.data?.id!,
        accountData.id,
        resData.data.id,
        dbPost.data?.createdAt!
      );

    if (!linkedinPostDbRecord.success) {
        logger.error(linkedinPostDbRecord.error)
      throw new ApiError(500, "crossposting failed");
    }
    // sending response
    logger.info('post created successfully');
    res
      .status(201)
      .json(new ApiResponse(201, linkedinPostDbRecord.data, "crossPosted"));
  }
);
