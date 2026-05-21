import type { BattleState } from '../types/battle';

export function BattleLog({ battle }: { battle: BattleState }) {
  return (
    <aside className="battle-log">
      <h3>Log</h3>
      <div>
        {battle.battleLog.slice(-12).reverse().map((entry, index) => (
          <p className={eventTone(entry.message)} key={`${entry.createdAt}-${index}`}>
            <span>T{entry.turn}</span>
            {entry.message}
          </p>
        ))}
      </div>
    </aside>
  );
}

function eventTone(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("super effective") || lower.includes('critico')) return 'log-hit';
  if (lower.includes('queda afectado') || lower.includes('sufre')) return 'log-status';
  if (lower.includes('debilito') || lower.includes('gana')) return 'log-finish';
  if (lower.includes('falla') || lower.includes('no effect') || lower.includes('not very')) return 'log-miss';
  return '';
}
