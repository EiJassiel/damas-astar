import type { ObjectId } from 'mongodb';

export type DamageClass = 'physical' | 'special' | 'status';

export type BaseStats = {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
};

export type PokemonDocument = {
  _id?: ObjectId;
  pokedexId: number;
  name: string;
  spriteUrl: string;
  types: string[];
  baseStats: BaseStats;
  moveIds: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
};

export type MoveDocument = {
  _id?: ObjectId;
  pokeApiId: number;
  name: string;
  type: string;
  power: number | null;
  accuracy: number | null;
  priority: number;
  damageClass: DamageClass;
  ailment?: string | null;
  effectChance?: number | null;
  statChanges?: Array<{ stat: string; change: number }>;
  createdAt: Date;
  updatedAt: Date;
};

export type TypeDocument = {
  _id?: ObjectId;
  name: string;
  doubleDamageTo: string[];
  halfDamageTo: string[];
  noDamageTo: string[];
  doubleDamageFrom: string[];
  halfDamageFrom: string[];
  noDamageFrom: string[];
};

export type PokemonApi = Omit<PokemonDocument, '_id' | 'moveIds'> & {
  id: string;
  moveIds: string[];
};
