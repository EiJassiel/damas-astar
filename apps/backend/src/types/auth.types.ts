export type BoardTheme = 'classic' | 'neon' | 'wood';
export type PieceStyle = 'sphere' | 'flat' | 'marble';

export type UserDocument = {
  userId: string;
  name: string;
  email: string;
  passwordHash: string;
  boardTheme: BoardTheme;
  pieceStyle: PieceStyle;
  unlockedThemes: BoardTheme[];
  unlockedPieceStyles: PieceStyle[];
  premium?: boolean;
  premiumSince?: Date | null;
  stripeCheckoutSessionId?: string;
  purchasedCosmetics?: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type AuthUser = {
  userId: string;
  email: string;
  name: string;
  boardTheme: BoardTheme;
  pieceStyle: PieceStyle;
  unlockedThemes: BoardTheme[];
  unlockedPieceStyles: PieceStyle[];
  premium?: boolean;
  premiumSince?: Date | null;
  purchasedCosmetics?: string[];
};
