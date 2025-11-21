import axios from "axios";
import { user } from "../controllers/user.controller";
import prisma from "../config/prisma";
import { json } from "node:stream/consumers";

export class LinkedinAccountServices {
  static getAccessToken = async (code: string) => {
    try {
      if (!code) {
        return {
          success: false,
          error: "code not provided",
        };
      }

      const parameters = new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri:
          "http://localhost:5000/api/v1/connection/linkedin/callback",
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKED_PRIMARY_CLIENT_SECRET!,
      });

      const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: parameters.toString(),
      });

      if (!res.ok) {
        console.log(res);
        throw new Error(`access token retrieval failed : ${res.statusText}`);
      }

      const response = (await res.json()) as AccessTokenRequesResponseType;

      return {
        success: true,
        response: response,
      };
    } catch (error) {
      console.log(error);
      return {
        sucess: false,
        error: "access token retrieval failed",
      };
    }
  };
  static getUserInfo = async (accessToken: string) => {
    try {
      if (!accessToken) {
        return {
          success: false,
          error: "access token not provided",
        };
      }

      const linkedinResponse = await fetch(
        "https://api.linkedin.com/v2/userinfo",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!linkedinResponse.ok) {
        return {
          success: false,
          error: "query failed",
        };
      }
      const res = (await linkedinResponse.json()) as LinkedinUserInfoType;
      return {
        success: true,
        data: res,
      };
    } catch (error) {
      console.log("error in getUserInfo service funcion :", error);
      return {
        success: false,
        error: "user info retrieval failed",
      };
    }
  };
  static createDatabseRecord = async (
    userinfo: LinkedinUserInfoType,
    accessTokenObj: AccessTokenRequesResponseType,
    userid: string
  ) => {
    try {
      const socialAccount = await prisma?.socialAccount.create({
        data: {
          owner_id: userid,
          platform: "LINKEDIN",
          platform_userid: userinfo.sub,
          display_name: userinfo.name,
          profile_picture: userinfo.picture,
          access_token: accessTokenObj.access_token,
          refresh_token: accessTokenObj.refresh_token || null,
          token_expiry: new Date(Date.now() + accessTokenObj.expires_in * 1000),
          platformData: userinfo,
          lastSync: new Date(),
        },
      });

      if (!socialAccount) {
        return {
          success: false,
          error: "database record creation failed",
        };
      }

      return {
        success: true,
        data: socialAccount,
      };
    } catch (error) {
      console.log(
        "an error occured in createDatabseRecord service function: ",
        error
      );
      return {
        success: false,
        error: " service failed",
      };
    }
  };
  static createTextPost = async (
    linkedinUserid: string,
    text: string,
    accessToken: string
  ) => {
    try {
      if (!linkedinUserid || !text || !accessToken) {
        return {
          success: false,
          error: "parameters not provided",
        };
      }

      const requestData = {
        author: `urn:li:person:${linkedinUserid}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: text,
            },
            shareMediaCategory: "NONE",
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      };

      const response = await axios.post(
        "https://api.linkedin.com/v2/ugcPosts",
        requestData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
          },
        }
      );


      if (response.status === 201) {
        return {
          success: true,
          data: response.data,
          message: "success",
        };
      }

      return {
        success: false,
        error:` api request failed @createTextPost @LinkedinAccontServices : ${response.data}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `service error : ${error}`,
      };
    }
  };
  static getUsersLinkedinAccount = async (userid: string) => {
    try {
      if (!user) {
        return {
          success: false,
          error: "parameters not provided",
        };
      }

      const accountData = await prisma.socialAccount.findFirst({
        where: {
          owner_id: userid,
          platform: "LINKEDIN",
        },
      });

      if (!accountData) {
        const data = await prisma.socialAccount.findFirst({
          where: {
            owner_id: userid,
            platform: "LIKENDIN",
          },
        });
        if (!data) {
          return {
            success: false,
            error: `Record not found : ${accountData}`,
          };
        }

        console.log("user linkedin db record:", data);
        return {
          success: true,
          data: data,
          message: "success",
        };
      }

      console.log("user linkedin db record:", accountData);
      return {
        success: true,
        data: accountData,
        message: "success",
      };
    } catch (error) {
      return {
        success: false,
        error: `service error : ${error}`,
      };
    }
  };
  static createPostDbRecord = async (
    userid: string,
    postid: string,
    linkedinAccountId: string,
    platformPostId: string,
    postedAt: Date
  ) => {
    try {
      if (
        !userid ||
        !postid ||
        !linkedinAccountId ||
        !platformPostId ||
        !postedAt
      ) {
        return {
          success: false,
          error:
            "parameters not provided @createPostDbRecord method @LinkedinAccountServices",
        };
      }

      const post = await prisma.platformPost.create({
        data: {
          post_id: postid,
          owner_id: userid,
          platform: "LINKEDIN",
          account_id: linkedinAccountId,
          platform_post_id: platformPostId,
          platform_post_url: `https://www.linkedin.com/feed/update/${platformPostId}/`,
          status: "POSTED",
          postedAt: postedAt,
        },
      });

      if (!post) {
        return {
          success: false,
          error:
            "db record creation failure @createPostDbRecord method @LinkedinAccountServices ",
        };
      }

      return {
        success: true,
        data: post,
      };
    } catch (error) {
      return {
        success: false,
        error: `service failure : ${error}`,
      };
    }
  };
  static registerImageUpload = async (
    accessToken: string,
    platform_userid: string
  ) => {
    try {
      if (!accessToken && !platform_userid) {
        return {
          success: false,
          error: "accessToken & userid not found",
        };
      }

      const response = await axios.post(
        "https://api.linkedin.com/v2/assets?action=registerUpload",
        {
          registerUploadRequest: {
            recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
            owner: `urn:li:person:${platform_userid}`,
            serviceRelationships: [
              {
                relationshipType: "OWNER",
                identifier: "urn:li:userGeneratedContent",
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "LinkedIn-Version": "202401",
          },
        }
      );

      if (response.status !== 200) {
        return {
          success: false,
          error: `image registeration failed : ${response.data}`,
        };
      }

      return {
        success: true,
        uploadUrl:
          response.data.value.uploadMechanism[
            "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
          ].uploadUrl,
        asset: response.data.value.asset,
        message: "success",
      };
    } catch (error) {
      console.log(
        `an error occured in registerImageUpload linkedinAccountServices : ${error}`
      );
      return {
        success: false,
        error: `service failed with error : ${error}`,
      };
    }
  };

  static uploadImageBinary = async (
    uploadUrl: string,
    imageBuffer: Buffer,
    LinkedinAccessToken: string
  ) => {
    try {
      if (!uploadUrl && !imageBuffer) {
        return {
          success: false,
          error: "uploadUrl & imageBuffer not found",
        };
      }

      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/octet-stream",
          Authorization: `Bearer ${LinkedinAccessToken}`,
        },
        body: imageBuffer,
      });

      
      if (!response.ok) {
        return {
          success: false,
          error: `image upload failed : ${response}`,
        };
      }


      return {
        success: true,
        message: "success",
      };
    } catch (error) {
      console.log(`an error occured in uploadImageBinary method : ${error}`);
      return {
        success: false,
        error: `service failed with ${error}`,
      };
    }
  };

  static uploadPostWithMedia = async (
    assetUrn: string,
    LinkedinAccessToken: string,
    LinkedinUserId: string,
    text?: string
  ) => {
    try {
      if (!assetUrn && !LinkedinAccessToken && !LinkedinUserId) {
        return {
          success: false,
          error: "parameters not found",
        };
      }

      const requestData = {
        author: `urn:li:person:${LinkedinUserId}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: text || "",
            },
            shareMediaCategory: "IMAGE",
            media: [
              {
                status: "READY",
                media: assetUrn,
              },
            ],
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      };

      const response = await axios.post(
        "https://api.linkedin.com/v2/ugcPosts",
        requestData,
        {
          headers: {
            Authorization: `Bearer ${LinkedinAccessToken}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
          },
        }
      );

      if (response.status !== 201) {
        return {
          success: false,
          error: `linkedin post upload failed : ${response.data}`,
        };
      }
  

      return {
        success: true,
        data: response.data,
        message: "success",
      };
    } catch (error) {
      console.log("upload post with media error", error);

      return {
        success: false,
        error: `service error : ${error}`,
      };
    }
  };
}

type AccessTokenRequesResponseType = {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token: string;
  refresh_token?: string;
};

type LinkedinUserInfoType = {
  sub: string;
  email_verified: boolean;
  name: string;
  locale: {
    country: string;
    language: string;
  };
  given_name: string;
  family_name: string;
  email: string;
  picture: string;
};
