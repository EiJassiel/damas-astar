import { ObjectId } from 'mongodb';
import { collections } from '../db/mongo';
import type { MoveDocument } from '../types/pokemon.types';

export async function upsertMove(move: MoveDocument) {
  const { moves } = await collections();
  const { createdAt, ...update } = move;
  await moves.updateOne(
    { pokeApiId: move.pokeApiId },
    { $set: { ...update, updatedAt: new Date() }, $setOnInsert: { createdAt } },
    { upsert: true }
  );
  return moves.findOne({ pokeApiId: move.pokeApiId });
}

export async function findMovesByIds(ids: ObjectId[]) {
  const { moves } = await collections();
  return moves.find({ _id: { $in: ids } }).toArray();
}
