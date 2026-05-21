export type ApiErrorResponse = {
  error: string;
  details?: unknown;
};

export type CreateRoomRequest = {
  playerName: string;
};

export type TeamRequest = {
  playerId: string;
  pokemonIds: string[];
};
