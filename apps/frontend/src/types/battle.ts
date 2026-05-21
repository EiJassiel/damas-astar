export type DamageClass = 'physical' | 'special' | 'status';
export type StatusType = 'burn' | 'poison' | 'paralysis' | 'attackDown' | 'defenseDown' | 'speedDown';

export type PokemonCatalogItem = {
  id: string;
  pokedexId: number;
  name: string;
  spriteUrl: string;
  types: string[];
  moves?: BattleMove[];
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
};

export type BattleMove = {
  moveId: string;
  name: string;
  type: string;
  power: number | null;
  accuracy: number | null;
  priority: number;
  damageClass: DamageClass;
  ailment?: string | null;
  effectChance?: number | null;
  statChanges?: Array<{ stat: string; change: number }>;
};

export type BattlePokemon = PokemonCatalogItem & {
  pokemonId: string;
  level: number;
  battleStats: PokemonCatalogItem['baseStats'] & { maxHp: number };
  currentHp: number;
  moves: BattleMove[];
  status: { type: StatusType; remainingTurns: number } | null;
  fainted: boolean;
};

export type BattlePlayer = {
  playerId: string;
  name: string;
  email?: string;
  team: BattlePokemon[];
  activeIndex: number;
  selectedAction?: { type: string; turn: number } | null;
  isBot?: boolean;
};

export type BattleState = {
  roomCode: string;
  status: 'team_selection' | 'active' | 'finished';
  turn: number;
  players: BattlePlayer[];
  battleLog: Array<{ turn: number; message: string; createdAt: string; meta?: Record<string, unknown> }>;
  winnerPlayerId?: string | null;
  forfeitedPlayerId?: string | null;
  penalty?: {
    type: 'forfeit';
    playerId: string;
    reason: string;
    appliedAt: string;
  } | null;
};

export type RoomState = {
  code: string;
  status: 'waiting' | 'ready' | 'team_selection' | 'in_battle' | 'finished';
  players: Array<{ playerId: string; name: string; email?: string; ready: boolean; teamPokemonIds: string[] }>;
};
