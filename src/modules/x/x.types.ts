export interface XTokenResponse {
  token_type: "bearer";
  expires_in: number;
  access_token: string;
  scope: string;
  refresh_token?: string;
  id_token?: string;
};

export interface XUserInfo {
  data: {
    id: string;
    name: string;
    username: string;
    created_at?: string;
    description?: string;
    location?: string;
    profile_image_url?: string;
    verified?: boolean;
    public_metrics?: {
      followers_count: number;
      following_count: number;
      tweet_count: number;
      listed_count: number;
    };
  };
}