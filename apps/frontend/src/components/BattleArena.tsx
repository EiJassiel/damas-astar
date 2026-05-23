import { useEffect, useRef, type CSSProperties } from 'react';
import { motion, useAnimate } from 'framer-motion';
import { useAuthUser } from '../context/AuthContext';
import { BattleFieldBackdrop, normalizeFieldType } from './BattleFieldBackdrop';
import { getFieldScene } from '../lib/battleFieldScenes';
import { DoorOpen, Gauge, Shield, Swords } from 'lucide-react';
import type { BattlePlayer, BattlePokemon, BattleState } from '../types/battle';
import { BattleLog } from './BattleLog';
import { HealthBar } from './HealthBar';
import { MoveButton } from './MoveButton';
import { StatusBadge } from './StatusBadge';

export function BattleArena({
  battle,
  playerId,
  onMove,
  onSwitch,
  onForfeit,
  forfeitPending
}: {
  battle: BattleState;
  playerId: string;
  onMove: (moveId: string) => void;
  onSwitch: (targetIndex: number) => void;
  onForfeit: () => void;
  forfeitPending?: boolean;
}) {
  const me = battle.players.find((player) => player.playerId === playerId) ?? battle.players[0];
  const rival = battle.players.find((player) => player.playerId !== me.playerId) ?? battle.players[1];
  const active = me.team[me.activeIndex];
  const enemy = rival.team[rival.activeIndex];
  const actionLocked = Boolean(me.selectedAction) || battle.status !== 'active';
  const activeUnable = active.fainted || active.currentHp <= 0;
  const moveLocked = actionLocked || activeUnable;
  const latestEvent = battle.battleLog.at(-1)?.message ?? 'La batalla comienza.';
  const eventClass = getEventClass(latestEvent);
  const hpSnapshot = useRef<Record<string, number>>({});
  const activeHpDelta = getHpDelta(active, hpSnapshot.current);
  const enemyHpDelta = getHpDelta(enemy, hpSnapshot.current);
  const turnState = getTurnState(me, rival, battle.status, activeUnable);
  const forfeitLabel = battle.status === 'finished' ? 'Partida cerrada' : forfeitPending ? 'Saliendo...' : 'Salir';
  const { premium } = useAuthUser();
  const attackVfx = getAttackVfx(battle, active.pokemonId, enemy.pokemonId);
  const baseFieldType = normalizeFieldType(active.types[0]);
  const fieldType = premium ? 'stadium' : baseFieldType;
  const fieldScene = getFieldScene(fieldType);
  const fieldImpact = eventClass === 'event-hit';
  const [battlefieldRef, animateBattlefield] = useAnimate();

  useEffect(() => {
    hpSnapshot.current = Object.fromEntries(
      battle.players.flatMap((player) => player.team.map((pokemon) => [pokemon.pokemonId, pokemon.currentHp]))
    );
  }, [battle]);

  useEffect(() => {
    if (!attackVfx) return;
    const layer = battlefieldRef.current?.querySelector('.field-canvas');
    if (!layer) return;
    void animateBattlefield(layer, { x: [0, -9, 9, -6, 6, 0] }, { duration: 0.38 });
  }, [attackVfx?.key, animateBattlefield, battlefieldRef]);

  return (
    <main className={`arena game-arena arena-type-${fieldType}${premium ? ' arena-premium' : ''}`}>
      {/* Left sidebar: team switcher */}
      <aside className="team-sidebar" aria-label="Equipo">
        <p className="sidebar-label">EQUIPO</p>
        {me.team.map((pokemon, index) => {
          const hpPct = Math.max(0, Math.round((pokemon.currentHp / pokemon.battleStats.maxHp) * 100));
          const hpColor = hpPct > 50 ? '#47f5d4' : hpPct > 20 ? '#ffd166' : '#e63946';
          return (
            <button
              key={pokemon.pokemonId}
              className={`sidebar-poke ${index === me.activeIndex ? 'active' : ''} ${pokemon.fainted ? 'fainted' : ''}`}
              disabled={actionLocked || index === me.activeIndex || pokemon.fainted}
              onClick={() => onSwitch(index)}
              type="button"
              title={`${pokemon.name} — ${pokemon.currentHp}/${pokemon.battleStats.maxHp} HP`}
            >
              <img src={pokemon.spriteUrl} alt={pokemon.name} />
              <div className="sidebar-poke-info">
                <span>{pokemon.name}</span>
                {!pokemon.fainted && (
                  <div className="sidebar-hp-bar">
                    <div className="sidebar-hp-fill" style={{ width: `${hpPct}%`, background: hpColor }} />
                  </div>
                )}
                <small>
                  {index === me.activeIndex
                    ? '⚔ En campo'
                    : pokemon.fainted
                    ? '✕ Debilitado'
                    : `${pokemon.currentHp}/${pokemon.battleStats.maxHp}`}
                </small>
              </div>
            </button>
          );
        })}
      </aside>

      {/* Main content */}
      <div className="arena-main">
        <header className="arena-top game-top">
          <div>
            <h1>Turno {battle.turn}</h1>
          </div>
          <div className="battle-score">
            <span>{me.name}</span>
            <Swords size={20} />
            <span>{rival.name}</span>
          </div>
          <div className={`turn-signal ${turnState.tone}`}>
            <Gauge size={18} />
            <strong>{turnState.title}</strong>
          </div>
          <button
            className="forfeit-button"
            disabled={battle.status === 'finished' || forfeitPending}
            onClick={() => {
              if (window.confirm('Si sales ahora, pierdes la partida por abandono. ¿Confirmas la salida?')) onForfeit();
            }}
            type="button"
            title="Abandonar"
          >
            <DoorOpen size={17} />
            {forfeitLabel}
          </button>
        </header>

        <section
          className={`battlefield battlefield-type-${fieldType}${premium ? ' battlefield-premium' : ''}`}
          aria-label="Campo de batalla"
          ref={battlefieldRef}
          style={
            {
              '--platform-top': fieldScene.platformTop,
              '--platform-shadow': fieldScene.platformShadow,
              '--platform-rim': fieldScene.platformRim
            } as CSSProperties
          }
        >
          <BattleFieldBackdrop type={fieldType} impact={fieldImpact} />
          <motion.div
            className={`event-toast ${eventClass}`}
            key={`${battle.turn}-${latestEvent}`}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.24 }}
          >
            {latestEvent}
          </motion.div>
          {attackVfx && <AttackVfx key={attackVfx.key} effect={attackVfx} />}
          <ScenePokemon pokemon={enemy} trainerName={rival.name} side="opponent" roleLabel="Rival activo" hpDelta={enemyHpDelta} />
          <ScenePokemon pokemon={active} trainerName={me.name} side="player" roleLabel="Tu activo" hpDelta={activeHpDelta} />
          <TeamBelt team={rival.team} activeIndex={rival.activeIndex} side="opponent" />
          <TeamBelt team={me.team} activeIndex={me.activeIndex} side="player" />
        </section>

        <section className="command-deck">
          <div className="command-message">
            <Shield size={18} />
            <div>
              <small>FIGHT</small>
              <strong>{active.name}</strong>
            </div>
          </div>
          <div className="moves-grid game-moves">
            {active.moves.map((move, index) => (
              <MoveButton
                key={move.moveId}
                hotkey={index + 1}
                move={move}
                disabled={moveLocked}
                onClick={() => onMove(move.moveId)}
              />
            ))}
          </div>
          <BattleLog battle={battle} />
        </section>
      </div>

      {battle.status === 'finished' && (
        <div className="result-banner">
          {battle.forfeitedPlayerId === playerId ? 'Derrota por abandono' : battle.winnerPlayerId === playerId ? 'Victoria' : 'Derrota'}
        </div>
      )}
    </main>
  );
}

function AttackVfx({ effect }: { effect: { side: 'player' | 'opponent'; type: string; key: string } }) {
  return (
    <div className={`attack-vfx ${effect.side} type-${effect.type}`} aria-hidden="true">
      <span />
      <i />
      <b />
    </div>
  );
}

function ScenePokemon({
  pokemon,
  trainerName,
  side,
  roleLabel,
  hpDelta
}: {
  pokemon: BattlePokemon;
  trainerName: string;
  side: 'player' | 'opponent';
  roleLabel: string;
  hpDelta: number;
}) {
  const hpPercent = Math.max(0, Math.round((pokemon.currentHp / pokemon.battleStats.maxHp) * 100));
  const statusClass = pokemon.status ? `has-status status-aura-${pokemon.status.type}` : '';

  return (
    <motion.article
      className={`scene-pokemon ${side} type-${pokemon.types[0] ?? 'normal'} ${statusClass} ${hpDelta < 0 ? 'took-hit' : ''} ${pokemon.fainted ? 'fainted' : ''}`}
      key={`${pokemon.pokemonId}-${pokemon.currentHp}-${pokemon.status?.type ?? 'ok'}-${side}`}
      initial={{ opacity: 0, y: side === 'player' ? 30 : -20, scale: 0.92 }}
      animate={{
        opacity: pokemon.fainted ? 0.5 : 1,
        y: 0,
        scale: pokemon.fainted ? 0.88 : 1,
        x: pokemon.fainted ? 0 : [0, side === 'player' ? -8 : 8, 0]
      }}
      transition={{ duration: 0.36 }}
    >
      <div className="battle-hud">
        <div className={`active-tag ${side}`}>{roleLabel}</div>
        <div className="hud-title">
          <span>{trainerName}</span>
          <strong>{pokemon.name}</strong>
          <small>Lv. {pokemon.level}</small>
        </div>
        <div className="type-row hud-types">
          {pokemon.types.map((type) => <i key={type}>{type}</i>)}
        </div>
        <HealthBar current={pokemon.currentHp} max={pokemon.battleStats.maxHp} />
        <div className="hud-meta">
          <StatusBadge pokemon={pokemon} />
          <span>{pokemon.currentHp}/{pokemon.battleStats.maxHp} HP · {hpPercent}%</span>
        </div>
      </div>
      <div className="sprite-pad">
        <span className={`field-label ${side}`}>{roleLabel}</span>
        {hpDelta !== 0 && (
          <motion.span
            className={`hp-pop ${hpDelta < 0 ? 'damage' : 'heal'}`}
            key={`${pokemon.pokemonId}-${pokemon.currentHp}`}
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: -22, scale: 1 }}
            transition={{ duration: 0.38 }}
          >
            {hpDelta < 0 ? `-${Math.abs(hpDelta)} HP` : `+${hpDelta} HP`}
          </motion.span>
        )}
        <img src={pokemon.spriteUrl} alt={pokemon.name} />
      </div>
    </motion.article>
  );
}

function getAttackVfx(battle: BattleState, playerActiveId: string, enemyActiveId: string) {
  const entry = [...battle.battleLog].reverse().find((log) => {
    const damage = Number(log.meta?.damage ?? 0);
    return damage > 0 && typeof log.meta?.defenderId === 'string';
  });
  if (!entry) return null;

  const defenderId = String(entry.meta?.defenderId);
  const side: 'player' | 'opponent' | null = defenderId === enemyActiveId ? 'player' : defenderId === playerActiveId ? 'opponent' : null;
  if (!side) return null;

  return {
    side,
    type: String(entry.meta?.moveType ?? 'normal'),
    key: `${entry.createdAt}-${entry.turn}-${defenderId}`
  };
}

function TeamBelt({ team, activeIndex, side }: { team: BattlePokemon[]; activeIndex: number; side: 'player' | 'opponent' }) {
  return (
    <div className={`team-belt ${side}`} aria-label={`Equipo ${side}`}>
      {team.map((pokemon, index) => (
        <span
          className={`${index === activeIndex ? 'active' : ''} ${pokemon.fainted ? 'down' : ''}`}
          key={pokemon.pokemonId}
          title={pokemon.name}
        >
          <img src={pokemon.spriteUrl} alt="" />
        </span>
      ))}
    </div>
  );
}

function getHpDelta(pokemon: BattlePokemon, snapshot: Record<string, number>) {
  const previous = snapshot[pokemon.pokemonId];
  if (previous === undefined) return 0;
  return pokemon.currentHp - previous;
}

function getTurnState(me: BattlePlayer, rival: BattlePlayer, status: BattleState['status'], activeUnable: boolean) {
  if (status === 'finished') {
    return { tone: 'done', title: 'Finalizada' };
  }
  if (activeUnable && !me.selectedAction) {
    return { tone: 'danger', title: 'Cambio obligatorio' };
  }
  if (!me.selectedAction) {
    return { tone: 'ready', title: 'Tu turno' };
  }
  if (!rival?.selectedAction) {
    return { tone: 'waiting', title: 'Esperando rival' };
  }
  return { tone: 'waiting', title: 'Resolviendo' };
}

function getEventClass(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("super effective") || lower.includes('critico')) return 'event-hit';
  if (lower.includes('queda afectado') || lower.includes('sufre')) return 'event-status';
  if (lower.includes('debilito') || lower.includes('gana')) return 'event-finish';
  if (lower.includes('falla') || lower.includes('no effect') || lower.includes('not very')) return 'event-miss';
  return 'event-normal';
}
