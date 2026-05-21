import { collections } from '../db/mongo';
import type { RoomDocument } from '../types/battle.types';

export async function createRoom(room: RoomDocument) {
  const { rooms } = await collections();
  await rooms.insertOne(room);
  return room;
}

export async function findRoom(code: string) {
  const { rooms } = await collections();
  return rooms.findOne({ code: code.toUpperCase() });
}

export async function saveRoom(room: RoomDocument) {
  const { rooms } = await collections();
  room.updatedAt = new Date();
  await rooms.replaceOne({ code: room.code }, room, { upsert: true });
  return room;
}
