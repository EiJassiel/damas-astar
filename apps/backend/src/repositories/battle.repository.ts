import { collections } from '../db/mongo';
import type { BattleDocument } from '../types/battle.types';

export async function findBattle(roomCode: string) {
  const { battles } = await collections();
  return battles.findOne({ roomCode: roomCode.toUpperCase() });
}

export async function saveBattle(battle: BattleDocument) {
  const { battles } = await collections();
  battle.updatedAt = new Date();
  await battles.replaceOne({ roomCode: battle.roomCode }, battle, { upsert: true });
  return battle;
}
