import type { BaseStats, DamageClass } from './pokemon.types';

export type RoomStatus = 'waiting' | 'ready' | 'team_selection' | 'in_battle' | 'finished';
export type BattleStatus = 'team_selection' | 'active' | 'finished';
export type StatusType = 'burn' | 'poison' | 'paralysis' | 'attackDown' | 'defenseDown' | 'speedDown';

export type RoomPlayer = {
  playerId: string;
  name: string;
  email: string;
  joinedAt: Date;
  ready: boolean;
  teamPokemonIds: string[];
  isBot?: boolean;
};

export type RoomDocument = {
  code: string;
  status: RoomStatus;
  players: RoomPlayer[];
  createdAt: Date;
  updatedAt: Date;
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

export type TemporaryStatus = {
  type: StatusType;
  remainingTurns: number;
};

export type BattlePokemon = {
  pokemonId: string;
  pokedexId: number;
  name: string;
  spriteUrl: string;
  types: string[];
  level: number;
  ivs: BaseStats;
  baseStats: BaseStats;
  battleStats: BaseStats & { maxHp: number };
  currentHp: number;
  moves: BattleMove[];
  status: TemporaryStatus | null;
  statStages: Omit<BaseStats, 'hp'>;
  fainted: boolean;
};

export type BattleAction =
  | { type: 'move'; playerId: string; moveId: string; turn: number }
  | { type: 'switch'; playerId: string; targetIndex: number; turn: number };

export type BattlePlayer = {
  playerId: string;
  name: string;
  email?: string;
  team: BattlePokemon[];
  activeIndex: number;
  selectedAction?: BattleAction | null;
  isBot?: boolean;
};

export type BattleLogEntry = {
  turn: number;
  message: string;
  createdAt: Date;
  meta?: Record<string, unknown>;
};

export type BattleDocument = {
  roomCode: string;
  status: BattleStatus;
  turn: number;
  players: BattlePlayer[];
  battleLog: BattleLogEntry[];
  winnerPlayerId?: string | null;
  forfeitedPlayerId?: string | null;
  penalty?: {
    type: 'forfeit';
    playerId: string;
    reason: string;
    appliedAt: Date;
  } | null;
  createdAt: Date;
  updatedAt: Date;
};
