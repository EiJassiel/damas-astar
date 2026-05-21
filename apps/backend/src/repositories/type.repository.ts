import { collections } from '../db/mongo';
import type { TypeDocument } from '../types/pokemon.types';

export async function upsertType(type: TypeDocument) {
  const { types } = await collections();
  await types.updateOne({ name: type.name }, { $set: type }, { upsert: true });
}

export async function listTypes() {
  const { types } = await collections();
  return types.find({}).sort({ name: 1 }).toArray();
}

export async function typeChartByName() {
  const rows = await listTypes();
  return Object.fromEntries(rows.map((row) => [row.name, row]));
}
