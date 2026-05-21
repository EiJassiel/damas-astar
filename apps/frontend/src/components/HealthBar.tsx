export function HealthBar({ current, max }: { current: number; max: number }) {
  const percent = Math.max(0, Math.min(100, Math.round((current / max) * 100)));
  const tone = percent > 50 ? 'healthy' : percent > 20 ? 'warning' : 'danger';
  return (
    <div className={`hp-shell ${tone}`} aria-label={`HP ${current} de ${max}`}>
      <div className={`hp-fill ${tone}`} style={{ width: `${percent}%` }} />
      <span>{current}/{max}</span>
    </div>
  );
}
