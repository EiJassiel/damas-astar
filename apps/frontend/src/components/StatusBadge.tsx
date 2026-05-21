import type { BattlePokemon } from '../types/battle';

const labels: Record<string, string> = {
  burn: 'BRN',
  poison: 'PSN',
  paralysis: 'PAR',
  attackDown: 'ATK-',
  defenseDown: 'DEF-',
  speedDown: 'SPD-'
};

export function StatusBadge({ pokemon }: { pokemon: BattlePokemon }) {
  if (!pokemon.status) return <span className="status-badge clear">OK</span>;
  return <span className={`status-badge status-${pokemon.status.type}`}>{labels[pokemon.status.type]} · {pokemon.status.remainingTurns}</span>;
}
