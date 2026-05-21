import { Zap } from 'lucide-react';
import type { BattleMove } from '../types/battle';

export function MoveButton({ move, disabled, onClick }: { move: BattleMove; disabled?: boolean; onClick: () => void }) {
  const powerLabel = move.power ? `Pot ${move.power}` : 'Estado';
  const accuracyLabel = move.accuracy ? `Prec ${move.accuracy}` : 'Prec --';

  return (
    <button className={`move-button type-${move.type}`} disabled={disabled} onClick={onClick} type="button" title={move.damageClass}>
      <Zap size={18} />
      <span>{move.name}</span>
      <small>{move.type} · {powerLabel} · {accuracyLabel}</small>
    </button>
  );
}
