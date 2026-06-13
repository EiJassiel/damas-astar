import { randomUUID } from 'node:crypto';
import { collections } from '../db/mongo';
import type { AuthUser } from '../types/auth.types';
import type {
  AiAlgorithm,
  CheckersBotDifficulty,
  CheckersColor,
  CheckersGameDocument,
  CheckersMove,
  CheckersPiece,
  CheckersPlayer,
  CheckersRoomDocument,
  CheckersScoreDocument
} from '../types/checkers.types';
import { unlockCosmeticsForUser } from './auth.service';
import { requestAiMove } from './ai-client';
import { createRoomCode } from '../utils/code';
import { recordMoveProcessed, setActiveGames } from '../utils/metrics';
import { AppError, assertFound } from '../utils/errors';

const BOARD_SIZE = 8;
const DEFAULT_RATING = 1200;
const ELO_K = 24;
const DRAW_REPEAT_LIMIT = 3;
const DRAW_MOVE_LIMIT = 80;
const gameLocks = new Map<string, Promise<unknown>>();

type RoomActor = { userId?: string; playerId?: string };

export async function createCheckersRoom(
  user: AuthUser,
  difficulty: CheckersBotDifficulty = 'medium'
) {
  const { rooms } = await collections();
  let code = createRoomCode();
  while (await rooms.findOne({ code })) code = createRoomCode();

  const now = new Date();
  const player = buildPlayer(user.name, 'red', user.userId);
  const room: CheckersRoomDocument = {
    code,
    status: 'waiting',
    players: [player],
    ownerPlayerId: player.playerId,
    ownerUserId: user.userId,
    botDifficulty: difficulty,
    aiAlgorithm: 'astar',
    createdAt: now,
    updatedAt: now
  };
  await rooms.insertOne(room);
  return { code, playerId: player.playerId, playerName: player.name, saved: true };
}

export async function createGuestCheckersRoom(
  difficulty: CheckersBotDifficulty = 'medium'
) {
  const { rooms } = await collections();
  let code = createRoomCode();
  while (await rooms.findOne({ code })) code = createRoomCode();

  const now = new Date();
  const player = buildPlayer('Invitado', 'red');
  const room: CheckersRoomDocument = {
    code,
    status: 'waiting',
    players: [player],
    ownerPlayerId: player.playerId,
    botDifficulty: difficulty,
    aiAlgorithm: 'astar',
    createdAt: now,
    updatedAt: now
  };
  await rooms.insertOne(room);
  return { code, playerId: player.playerId, playerName: player.name, saved: false };
}

export async function joinCheckersRoom(code: string, user: AuthUser) {
  const { rooms } = await collections();
  const room = assertFound((await rooms.findOne({ code: code.toUpperCase() })) as CheckersRoomDocument | null, 'Sala no encontrada.');
  if (room.players.some((player) => player.userId === user.userId)) throw new AppError('Ya perteneces a esta sala.', 409);
  if (room.players.length >= 2) throw new AppError('La sala ya tiene dos jugadores.', 409);
  const player = buildPlayer(user.name, 'black', user.userId);
  room.players.push(player);
  room.status = 'ready';
  room.updatedAt = new Date();
  await rooms.replaceOne({ code: room.code }, room);
  return { code: room.code, playerId: player.playerId, playerName: player.name };
}

export async function addBotToCheckersRoom(
  code: string,
  actor: RoomActor,
  difficulty: CheckersBotDifficulty = 'medium'
) {
  const { rooms } = await collections();
  const room = assertFound((await rooms.findOne({ code: code.toUpperCase() })) as CheckersRoomDocument | null, 'Sala no encontrada.');
  if (!isRoomOwner(room, actor)) throw new AppError('Solo el creador puede agregar CPU.', 403);
  if (room.players.length >= 2) throw new AppError('La sala ya tiene dos jugadores.', 409);
  room.players.push(buildPlayer(`Computadora ${difficultyLabel(difficulty)}`, 'black', undefined, true, difficulty));
  room.botDifficulty = difficulty;
  room.aiAlgorithm = 'astar';
  room.status = 'ready';
  room.updatedAt = new Date();
  await rooms.replaceOne({ code: room.code }, room);
  return room;
}

export async function getCheckersRoom(code: string) {
  const { rooms } = await collections();
  return assertFound((await rooms.findOne({ code: code.toUpperCase() })) as CheckersRoomDocument | null, 'Sala no encontrada.');
}

export async function listUserGames(userId: string) {
  const { battles } = await collections();
  const games = (await battles.find({ userId }).sort({ updatedAt: -1 }).limit(20).toArray()) as CheckersGameDocument[];
  await refreshActiveGamesMetric();
  return games.map((game) => ({
    roomCode: game.roomCode,
    status: game.status,
    turn: game.turn,
    turnNumber: game.turnNumber,
    botDifficulty: game.botDifficulty,
    winnerColor: game.winnerColor ?? null,
    result: game.result ?? null,
    updatedAt: game.updatedAt,
    createdAt: game.createdAt
  }));
}

export async function startCheckersGame(code: string, actor: RoomActor) {
  const { rooms, battles } = await collections();
  const room = assertFound((await rooms.findOne({ code: code.toUpperCase() })) as CheckersRoomDocument | null, 'Sala no encontrada.');
  const human = findRoomHuman(room, actor);
  if (!human) throw new AppError('Jugador no pertenece a la sala.', 403);
  if (room.players.length !== 2) throw new AppError('Se necesitan dos jugadores para iniciar.', 409);
  const existing = (await battles.findOne({ roomCode: room.code })) as CheckersGameDocument | null;
  if (existing) return existing;

  const now = new Date();
  const game: CheckersGameDocument = {
    roomCode: room.code,
    userId: actor.userId,
    status: 'active',
    players: room.players,
    botDifficulty: room.botDifficulty ?? 'medium',
    aiAlgorithm: 'astar',
    lastAiMeta: null,
    lastAiComparison: null,
    board: createInitialBoard(),
    turn: 'red',
    turnNumber: 1,
    moveCount: 0,
    movesWithoutCapture: 0,
    positionHashes: [hashPosition(createInitialBoard(), 'red')],
    winnerColor: null,
    winnerPlayerId: null,
    result: null,
    drawReason: null,
    forcedPieceId: null,
    lastMove: null,
    log: [{ turn: 1, message: 'La partida comienza. Rojas mueven primero.', createdAt: now }],
    createdAt: now,
    updatedAt: now
  };

  room.status = 'in_game';
  room.gameId = room.code;
  room.updatedAt = now;
  await rooms.replaceOne({ code: room.code }, room);
  await battles.replaceOne({ roomCode: game.roomCode }, game, { upsert: true });
  await refreshActiveGamesMetric();
  return game;
}

export async function restartCheckersGame(code: string, actor: RoomActor) {
  const { rooms, battles } = await collections();
  const room = assertFound((await rooms.findOne({ code: code.toUpperCase() })) as CheckersRoomDocument | null, 'Sala no encontrada.');
  if (!isRoomOwner(room, actor)) throw new AppError('Solo el creador puede reiniciar.', 403);
  await battles.deleteOne({ roomCode: room.code });
  room.status = 'ready';
  room.updatedAt = new Date();
  await rooms.replaceOne({ code: room.code }, room);
  return startCheckersGame(code, actor);
}

export async function getCheckersGame(code: string) {
  const { battles } = await collections();
  return assertFound((await battles.findOne({ roomCode: code.toUpperCase() })) as CheckersGameDocument | null, 'Partida no encontrada.');
}

export async function makeCheckersMove(code: string, playerId: string, move: CheckersMove, correlationId?: string) {
  return withGameLock(code, () => makeCheckersMoveUnsafe(code, playerId, move, correlationId));
}

async function makeCheckersMoveUnsafe(code: string, playerId: string, move: CheckersMove, correlationId?: string) {
  const { battles } = await collections();
  const game = assertFound((await battles.findOne({ roomCode: code.toUpperCase() })) as CheckersGameDocument | null, 'Partida no encontrada.');
  if (game.status !== 'active') throw new AppError('La partida ya termino.', 409);
  const player = game.players.find((candidate) => candidate.playerId === playerId);
  if (!player) throw new AppError('Jugador no pertenece a la partida.', 403);
  if (player.color !== game.turn) throw new AppError('No es tu turno.', 409);
  if (player.isBot) throw new AppError('Usa la accion de CPU para el turno del bot.', 409);
  applyPlayerMoveToGame(game, player, move);
  recordMoveProcessed();
  await maybePersistFinishedGameScores(game);
  game.updatedAt = new Date();
  await battles.replaceOne({ roomCode: game.roomCode }, game);
  await refreshActiveGamesMetric();
  return game;
}

export async function playCheckersBotTurn(code: string, correlationId?: string) {
  return withGameLock(code, () => playCheckersBotTurnUnsafe(code, correlationId));
}

async function playCheckersBotTurnUnsafe(code: string, correlationId?: string) {
  const { battles } = await collections();
  const game = assertFound((await battles.findOne({ roomCode: code.toUpperCase() })) as CheckersGameDocument | null, 'Partida no encontrada.');
  if (game.status !== 'active') throw new AppError('La partida ya termino.', 409);
  await maybePlayBot(game, correlationId);
  await maybePersistFinishedGameScores(game);
  game.updatedAt = new Date();
  await battles.replaceOne({ roomCode: game.roomCode }, game);
  await refreshActiveGamesMetric();
  return game;
}

export async function resignCheckersGame(code: string, playerId: string) {
  return withGameLock(code, () => resignCheckersGameUnsafe(code, playerId));
}

async function resignCheckersGameUnsafe(code: string, playerId: string) {
  const { battles } = await collections();
  const game = assertFound((await battles.findOne({ roomCode: code.toUpperCase() })) as CheckersGameDocument | null, 'Partida no encontrada.');
  if (game.status !== 'active') throw new AppError('La partida ya termino.', 409);
  const player = game.players.find((candidate) => candidate.playerId === playerId);
  if (!player) throw new AppError('Jugador no pertenece a la partida.', 403);
  const winnerColor = opponent(player.color);
  finishGame(game, winnerColor, 'resign', `${player.name} se rinde.`);
  await maybePersistFinishedGameScores(game);
  game.updatedAt = new Date();
  await battles.replaceOne({ roomCode: game.roomCode }, game);
  await refreshActiveGamesMetric();
  return game;
}

export async function getCheckersLeaderboard(limit = 10, sort: 'rating' | 'wins' | 'winRate' = 'rating') {
  const { scores } = await collections();
  const rows = (await scores.find({}).toArray()) as CheckersScoreDocument[];
  const sorted = rows
    .map((row) => ({
      ...row,
      winRate: row.gamesPlayed > 0 ? row.wins / row.gamesPlayed : 0,
      avgMovesInWins: row.winsForMoveAverage > 0 ? row.totalMovesInWins / row.winsForMoveAverage : 0
    }))
    .sort((a, b) => {
      if (sort === 'wins') return b.wins - a.wins || b.rating - a.rating;
      if (sort === 'winRate') return b.winRate - a.winRate || b.wins - a.wins;
      return b.rating - a.rating;
    })
    .slice(0, Math.max(1, Math.min(50, limit)));
  return sorted.map((row, index) => ({
    rank: index + 1,
    userId: row.userId,
    playerKey: row.playerKey,
    name: row.name,
    rating: row.rating,
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
    gamesPlayed: row.gamesPlayed,
    winRate: Math.round(row.winRate * 1000) / 10,
    avgMovesInWins: Math.round(row.avgMovesInWins * 10) / 10,
    bestWinStreak: row.bestWinStreak,
    updatedAt: row.updatedAt
  }));
}

async function maybePlayBot(game: CheckersGameDocument, correlationId?: string) {
  let safety = 0;
  while (game.status === 'active' && safety < 8) {
    const bot = game.players.find((player) => player.color === game.turn && player.isBot);
    if (!bot) return;
    const difficulty = game.botDifficulty ?? bot.botDifficulty ?? 'medium';
    const ai = await requestAiMove({
      difficulty,
      board: game.board,
      currentPlayer: game.turn,
      forcedPieceId: game.forcedPieceId,
      correlationId
    });
    if (!ai) return;
    const player = game.players.find((candidate) => candidate.color === game.turn && candidate.isBot);
    if (!player) return;
    game.lastAiMeta = ai.meta;
    game.lastAiComparison = null;
    applyPlayerMoveToGame(game, player, ai.move);
    recordMoveProcessed();
    safety += 1;
  }
}

function buildPlayer(name: string, color: CheckersColor, userId?: string, isBot = false, botDifficulty: CheckersBotDifficulty = 'medium'): CheckersPlayer {
  return { playerId: randomUUID(), userId, name: cleanName(name), color, joinedAt: new Date(), isBot, botDifficulty: isBot ? botDifficulty : undefined };
}

function roomOwnerPlayerId(room: CheckersRoomDocument) {
  return room.ownerPlayerId ?? room.players.find((player) => !player.isBot && player.color === 'red')?.playerId;
}

function isRoomOwner(room: CheckersRoomDocument, actor: RoomActor) {
  if (actor.userId && room.ownerUserId === actor.userId) return true;
  if (actor.playerId && roomOwnerPlayerId(room) === actor.playerId) return true;
  return false;
}

function findRoomHuman(room: CheckersRoomDocument, actor: RoomActor) {
  return room.players.find((player) => {
    if (player.isBot) return false;
    if (actor.userId) return player.userId === actor.userId;
    if (actor.playerId) return player.playerId === actor.playerId;
    return false;
  });
}

function cleanName(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(0, 24) : 'Jugador';
}

function difficultyLabel(difficulty: CheckersBotDifficulty) {
  if (difficulty === 'easy') return 'facil';
  if (difficulty === 'hard') return 'dificil';
  return 'media';
}

function createInitialBoard(): CheckersPiece[] {
  const pieces: CheckersPiece[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (isPlayable(row, col)) pieces.push({ id: `black-${row}-${col}`, color: 'black', kind: 'man', row, col });
    }
  }
  for (let row = 5; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (isPlayable(row, col)) pieces.push({ id: `red-${row}-${col}`, color: 'red', kind: 'man', row, col });
    }
  }
  return pieces;
}

function applyMove(board: CheckersPiece[], color: CheckersColor, move: CheckersMove, forcedPieceId: string | null) {
  validateSquare(move.from);
  validateSquare(move.to);
  if (!isPlayable(move.to.row, move.to.col)) throw new AppError('Solo puedes caer en casillas oscuras.');
  const piece = board.find((candidate) => candidate.row === move.from.row && candidate.col === move.from.col);
  if (!piece || piece.color !== color) throw new AppError('No hay una ficha tuya en esa casilla.');
  if (forcedPieceId && piece.id !== forcedPieceId) throw new AppError('Debes continuar la captura con la misma ficha.');
  if (board.some((candidate) => candidate.row === move.to.row && candidate.col === move.to.col)) {
    throw new AppError('La casilla destino esta ocupada.');
  }
  const forcedCaptures = legalMovesForColor(board, color).filter((candidate) => candidate.capture);
  const legalMoves = legalMovesForPiece(board, piece);
  const selected = legalMoves.find((candidate) => sameSquare(candidate.to, move.to));
  if (!selected) throw new AppError('Movimiento invalido.');
  if (forcedPieceId && !selected.capture) throw new AppError('Debes completar la captura multiple.');
  if (forcedCaptures.length > 0 && !selected.capture) throw new AppError('Hay una captura obligatoria.');
  const nextBoard = board.filter((candidate) => candidate.id !== selected.capture?.id);
  const moving = nextBoard.find((candidate) => candidate.id === piece.id);
  if (!moving) throw new AppError('Movimiento invalido.');
  moving.row = move.to.row;
  moving.col = move.to.col;
  moving.kind =
    moving.kind === 'king' || (moving.color === 'red' && move.to.row === 0) || (moving.color === 'black' && move.to.row === 7)
      ? 'king'
      : moving.kind;
  return { board: nextBoard, capturedPieceId: selected.capture?.id ?? null, pieceId: piece.id };
}

function applyPlayerMoveToGame(game: CheckersGameDocument, player: CheckersPlayer, move: CheckersMove) {
  const result = applyMove(game.board, player.color, move, game.forcedPieceId ?? null);
  game.board = result.board;
  game.lastMove = { ...move, capturedPieceId: result.capturedPieceId, playerId: player.playerId };
  game.moveCount += 1;
  game.movesWithoutCapture = result.capturedPieceId ? 0 : game.movesWithoutCapture + 1;
  game.log.unshift({
    turn: game.turnNumber,
    message: `${player.name} mueve ${squareName(move.from)} a ${squareName(move.to)}${result.capturedPieceId ? ' y captura.' : '.'}`,
    createdAt: new Date()
  });

  const movingPiece = game.board.find((piece) => piece.id === result.pieceId);
  const mustContinue = Boolean(result.capturedPieceId && movingPiece && legalMovesForPiece(game.board, movingPiece).some((candidate) => candidate.capture));
  const nextTurn = mustContinue ? player.color : opponent(player.color);

  if (!mustContinue) trackPosition(game, nextTurn);

  if (game.movesWithoutCapture >= DRAW_MOVE_LIMIT) {
    finishDraw(game, 'Empate por limite de movimientos sin captura.');
    return;
  }
  if (isRepetitionDraw(game)) {
    finishDraw(game, 'Empate por repeticion de posicion.');
    return;
  }

  const winner = findWinner(game.board, nextTurn);
  if (winner) {
    finishGame(game, winner, winner === 'red' ? 'red_win' : 'black_win', `${winner === 'red' ? 'Rojas' : 'Negras'} ganan la partida.`);
    return;
  }

  game.forcedPieceId = mustContinue ? result.pieceId : null;
  game.turn = nextTurn;
  if (mustContinue) {
    game.log.unshift({ turn: game.turnNumber, message: 'Captura multiple disponible. Debes continuar con la misma ficha.', createdAt: new Date() });
  } else {
    game.turnNumber += 1;
  }
}

function trackPosition(game: CheckersGameDocument, nextTurn: CheckersColor) {
  const hash = hashPosition(game.board, nextTurn);
  game.positionHashes.push(hash);
}

function hashPosition(board: CheckersPiece[], turn: CheckersColor) {
  const pieces = [...board].sort((a, b) => a.id.localeCompare(b.id)).map((piece) => `${piece.id}:${piece.row},${piece.col},${piece.kind}`).join('|');
  return `${turn}#${pieces}`;
}

function isRepetitionDraw(game: CheckersGameDocument) {
  const current = game.positionHashes.at(-1);
  if (!current) return false;
  return game.positionHashes.filter((hash) => hash === current).length >= DRAW_REPEAT_LIMIT;
}

function finishDraw(game: CheckersGameDocument, reason: string) {
  game.status = 'finished';
  game.winnerColor = null;
  game.winnerPlayerId = null;
  game.result = 'draw';
  game.drawReason = reason;
  game.forcedPieceId = null;
  game.log.unshift({ turn: game.turnNumber, message: reason, createdAt: new Date() });
}

function finishGame(game: CheckersGameDocument, winnerColor: CheckersColor, result: 'red_win' | 'black_win' | 'resign', message: string) {
  game.status = 'finished';
  game.winnerColor = winnerColor;
  game.winnerPlayerId = game.players.find((candidate) => candidate.color === winnerColor)?.playerId ?? null;
  game.result = result;
  game.forcedPieceId = null;
  game.log.unshift({ turn: game.turnNumber, message, createdAt: new Date() });
}

function legalMovesForColor(board: CheckersPiece[], color: CheckersColor) {
  return board.filter((piece) => piece.color === color).flatMap((piece) => legalMovesForPiece(board, piece));
}

function legalMovesForPiece(board: CheckersPiece[], piece: CheckersPiece) {
  const moves: Array<{ to: { row: number; col: number }; capture?: CheckersPiece }> = [];
  for (const [dr, dc] of directions(piece)) {
    const step = { row: piece.row + dr, col: piece.col + dc };
    const jump = { row: piece.row + dr * 2, col: piece.col + dc * 2 };
    if (inBounds(step) && !pieceAt(board, step)) moves.push({ to: step });
    const middle = pieceAt(board, step);
    if (middle && middle.color !== piece.color && inBounds(jump) && !pieceAt(board, jump)) {
      moves.push({ to: jump, capture: middle });
    }
  }
  return moves;
}

function directions(piece: CheckersPiece) {
  if (piece.kind === 'king') return [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  return piece.color === 'red' ? [[-1, 1], [-1, -1]] : [[1, 1], [1, -1]];
}

function findWinner(board: CheckersPiece[], nextTurn: CheckersColor) {
  const redPieces = board.filter((piece) => piece.color === 'red').length;
  const blackPieces = board.filter((piece) => piece.color === 'black').length;
  if (redPieces === 0) return 'black' as CheckersColor;
  if (blackPieces === 0) return 'red' as CheckersColor;
  if (legalMovesForColor(board, nextTurn).length === 0) return opponent(nextTurn);
  return null;
}

function validateSquare(square: { row: number; col: number }) {
  if (!inBounds(square)) throw new AppError('Casilla fuera del tablero.');
}

function inBounds(square: { row: number; col: number }) {
  return square.row >= 0 && square.row < BOARD_SIZE && square.col >= 0 && square.col < BOARD_SIZE;
}

function isPlayable(row: number, col: number) {
  return (row + col) % 2 === 1;
}

function pieceAt(board: CheckersPiece[], square: { row: number; col: number }) {
  return board.find((piece) => sameSquare(piece, square));
}

function sameSquare(a: { row: number; col: number }, b: { row: number; col: number }) {
  return a.row === b.row && a.col === b.col;
}

function opponent(color: CheckersColor): CheckersColor {
  return color === 'red' ? 'black' : 'red';
}

function squareName(square: { row: number; col: number }) {
  return `${String.fromCharCode(65 + square.col)}${BOARD_SIZE - square.row}`;
}

async function maybePersistFinishedGameScores(game: CheckersGameDocument) {
  if (game.status !== 'finished' || game.log.some((entry) => entry.message.includes('[score_saved]'))) return;
  const humans = game.players.filter((player) => !player.isBot && player.userId);
  if (humans.length === 0) return;

  if (game.result === 'draw') {
    for (const player of humans) {
      const score = await getOrCreateScore(player.userId!, player.name);
      await saveScore({ ...score, draws: score.draws + 1, gamesPlayed: score.gamesPlayed + 1, winStreak: 0, updatedAt: new Date() });
    }
    game.log.unshift({ turn: game.turnNumber, message: '[score_saved] draw', createdAt: new Date() });
    return;
  }

  const winner = humans.find((player) => player.playerId === game.winnerPlayerId);
  if (!winner?.userId) {
    for (const player of humans) {
      const score = await getOrCreateScore(player.userId!, player.name);
      await saveScore({ ...score, losses: score.losses + 1, gamesPlayed: score.gamesPlayed + 1, winStreak: 0, updatedAt: new Date() });
    }
    game.log.unshift({ turn: game.turnNumber, message: '[score_saved] loss_vs_bot', createdAt: new Date() });
    return;
  }

  const winnerScore = await getOrCreateScore(winner.userId, winner.name);
  const nextWinStreak = winnerScore.winStreak + 1;
  const loser = humans.find((player) => player.playerId !== winner.playerId);

  if (loser?.userId) {
    const loserScore = await getOrCreateScore(loser.userId, loser.name);
    const [winnerNext, loserNext] = eloUpdate(winnerScore.rating, loserScore.rating, 1);
    await saveScore({
      ...winnerScore,
      rating: winnerNext,
      wins: winnerScore.wins + 1,
      gamesPlayed: winnerScore.gamesPlayed + 1,
      winStreak: nextWinStreak,
      bestWinStreak: Math.max(winnerScore.bestWinStreak, nextWinStreak),
      totalMovesInWins: winnerScore.totalMovesInWins + game.moveCount,
      winsForMoveAverage: winnerScore.winsForMoveAverage + 1,
      updatedAt: new Date()
    });
    await saveScore({ ...loserScore, rating: loserNext, losses: loserScore.losses + 1, gamesPlayed: loserScore.gamesPlayed + 1, winStreak: 0, updatedAt: new Date() });
  } else {
    await saveScore({
      ...winnerScore,
      wins: winnerScore.wins + 1,
      gamesPlayed: winnerScore.gamesPlayed + 1,
      winStreak: nextWinStreak,
      bestWinStreak: Math.max(winnerScore.bestWinStreak, nextWinStreak),
      totalMovesInWins: winnerScore.totalMovesInWins + game.moveCount,
      winsForMoveAverage: winnerScore.winsForMoveAverage + 1,
      updatedAt: new Date()
    });
  }
  await unlockCosmeticsForUser(winner.userId, winnerScore.wins + 1);

  game.log.unshift({ turn: game.turnNumber, message: '[score_saved] win', createdAt: new Date() });
}

async function getOrCreateScore(userId: string, name: string) {
  const { scores } = await collections();
  const playerKey = userId;
  const existing = (await scores.findOne({ userId })) as CheckersScoreDocument | null;
  if (existing) return existing;
  const fresh: CheckersScoreDocument = {
    userId,
    playerKey,
    name: cleanName(name),
    rating: DEFAULT_RATING,
    wins: 0,
    losses: 0,
    draws: 0,
    gamesPlayed: 0,
    winStreak: 0,
    bestWinStreak: 0,
    totalMovesInWins: 0,
    winsForMoveAverage: 0,
    updatedAt: new Date()
  };
  await scores.replaceOne({ userId }, fresh, { upsert: true });
  return fresh;
}

async function saveScore(score: CheckersScoreDocument) {
  const { scores } = await collections();
  await scores.replaceOne({ userId: score.userId }, score, { upsert: true });
}

function eloUpdate(ratingA: number, ratingB: number, scoreA: 0 | 0.5 | 1): [number, number] {
  const expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;
  return [Math.round(ratingA + ELO_K * (scoreA - expectedA)), Math.round(ratingB + ELO_K * ((1 - scoreA) - expectedB))];
}

async function refreshActiveGamesMetric() {
  const { battles } = await collections();
  const active = (await battles.find({ status: 'active' }).toArray()) as CheckersGameDocument[];
  setActiveGames(active.length);
}

async function withGameLock<T>(code: string, task: () => Promise<T>) {
  const key = code.toUpperCase();
  const previous = gameLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = previous.then(() => current);
  gameLocks.set(key, chained);
  await previous.catch(() => undefined);
  try {
    return await task();
  } finally {
    release();
    if (gameLocks.get(key) === chained) gameLocks.delete(key);
  }
}
