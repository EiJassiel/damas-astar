export type UserDocument = {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  premium?: boolean;
  premiumSince?: Date;
  stripeCheckoutSessionId?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthUser = {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
};
