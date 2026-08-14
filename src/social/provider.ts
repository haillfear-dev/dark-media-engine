export interface SocialProvider { validateAccount():Promise<boolean>; publish():Promise<{externalPostId:string}>; getPublicationStatus():Promise<string>; getMetrics():Promise<Record<string,number>>; }
export const SUPPORTED_PLATFORMS=["TIKTOK","INSTAGRAM","YOUTUBE_SHORTS","FACEBOOK","KWAI"] as const;
