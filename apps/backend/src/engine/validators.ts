import type { BattleAction, BattleDocument } from '../types/battle.types';
import { AppError } from '../utils/errors';

export function validateAction(battle: BattleDocument, action: BattleAction) {
  if (battle.status !== 'active') throw new AppError('La batalla no esta activa.', 409);
  if (action.turn !== battle.turn) throw new AppError('La accion pertenece a otro turno.', 409);

  const player = battle.players.find((candidate) => candidate.playerId === action.playerId);
  if (!player) throw new AppError('Jugador no pertenece a la batalla.', 403);
  if (player.selectedAction) throw new AppError('Este jugador ya eligio accion en este turno.', 409);

  const active = player.team[player.activeIndex];
  if (!active) throw new AppError('El Pokemon activo no existe.', 409);

  if (action.type === 'move') {
    if (active.fainted || active.currentHp <= 0) throw new AppError('El Pokemon activo no puede atacar. Debes cambiar de Pokemon.', 409);
    if (!active.moves.some((move) => move.moveId === action.moveId)) throw new AppError('Movimiento invalido.', 400);
  }

  if (action.type === 'switch') {
    const target = player.team[action.targetIndex];
    if (!target) throw new AppError('Pokemon de cambio inexistente.', 400);
    if (action.targetIndex === player.activeIndex) throw new AppError('Ese Pokemon ya esta activo.', 400);
    if (target.fainted || target.currentHp <= 0) throw new AppError('No se puede cambiar a un Pokemon debilitado.', 400);
  }
}
