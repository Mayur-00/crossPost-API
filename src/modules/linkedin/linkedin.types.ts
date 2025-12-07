export interface linkedinAccessTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token: string;
}

export interface linkedInMediaRegisterResponse {
  asset: string;
  uploadUrl: string;
}

export interface LinkedinUserInfoResponse {
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
}

export interface LinkedinPostPublishResponse {
  id: string;
}

export type LinkedinUserInfoType = {
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

export type AccessTokenResponseType = {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token: string;
  refresh_token?: string;
};
