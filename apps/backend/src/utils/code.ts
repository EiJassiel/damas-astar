import { randomInt } from './random';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const createRoomCode = () =>
  Array.from({ length: 6 }, () => alphabet[randomInt(0, alphabet.length - 1)]).join('');
