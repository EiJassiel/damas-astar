import { Zap } from 'lucide-react';
import type { BattleMove } from '../types/battle';

export function MoveButton({
  move,
  disabled,
  hotkey,
  onClick
}: {
  move: BattleMove;
  disabled?: boolean;
  hotkey?: number;
  onClick: () => void;
}) {
  const powerLabel = move.power ? `Pot ${move.power}` : 'Estado';
  const accuracyLabel = move.accuracy ? `Prec ${move.accuracy}` : 'Prec --';

  return (
    <button
      className={`move-button type-${move.type}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
      title={move.damageClass}
    >
      {hotkey !== undefined && <kbd className="move-hotkey">{hotkey}</kbd>}
      <Zap size={18} />
      <span>{move.name}</span>
      <small>{move.type} · {powerLabel} · {accuracyLabel}</small>
    </button>
  );
}
