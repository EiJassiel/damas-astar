import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Bot, Flag, Home, Loader2, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CheckersBoard } from '../components/CheckersBoard';
import { LoadingPanel } from '../components/ScreenShell';
import { useAuth } from '../context/AuthContext';
import { useBattlePolling } from '../hooks/useBattlePolling';
import { api, clearSession, getSession, saveSession } from '../services/api';
import type { CheckersGameState } from '../types/checkers';
import { reconcileBattleState } from '../utils/reconcileBattleState';

const BOT_DELAY_MS = 2000;
const BOT_TRACE_MS = 3000;

export const Route = createFileRoute('/battle/$code')({
  component: BattlePage
});

function BattlePage() {
  const { code } = Route.useParams();
  const { authUser } = useAuth();
  const session = getSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const botActedForTurn = useRef<string>('');
  const botDelayTimer = useRef<number | null>(null);
  const traceTimer = useRef<number | null>(null);
  const [botDelayActive, setBotDelayActive] = useState(false);
  const [cpuMoveTrace, setCpuMoveTrace] = useState<{ from: { row: number; col: number }; to: { row: number; col: number } } | null>(null);

  const moveMutation = useMutation({
    mutationFn: ({ from, to }: { from: { row: number; col: number }; to: { row: number; col: number } }) =>
      api.moveCheckersPiece(code, session.playerId, from, to),
    onSuccess: (nextGame) => {
      queryClient.setQueryData<CheckersGameState>(['battle', code], (previous) => reconcileBattleState(previous, nextGame));
    }
  });
  const botTurnMutation = useMutation({
    mutationFn: () => api.playCheckersBotTurn(code),
    onSuccess: (nextGame) => {
      const bot = nextGame.players.find((player) => player.isBot);
      if (bot && nextGame.lastMove?.playerId === bot.playerId) {
        setCpuMoveTrace({ from: nextGame.lastMove.from, to: nextGame.lastMove.to });
        if (traceTimer.current) window.clearTimeout(traceTimer.current);
        traceTimer.current = window.setTimeout(() => setCpuMoveTrace(null), BOT_TRACE_MS);
      }
      queryClient.setQueryData<CheckersGameState>(['battle', code], (previous) => reconcileBattleState(previous, nextGame));
    }
  });
  const cpuComputing = botDelayActive || botTurnMutation.isPending || moveMutation.isPending;
  const game = useBattlePolling(code, cpuComputing);
  const resignMutation = useMutation({
    mutationFn: () => api.resignCheckersGame(code, session.playerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['battle', code] })
  });
  const restartMutation = useMutation({
    mutationFn: () => api.restartCheckersGame(code, authUser ? undefined : session.playerId),
    onSuccess: (nextGame) => {
      const me = nextGame.players.find((player) => !player.isBot);
      if (me) saveSession({ code, playerId: me.playerId, playerName: me.name });
      queryClient.setQueryData<CheckersGameState>(['battle', code], (previous) => reconcileBattleState(previous, nextGame));
    }
  });
  const startMutation = useMutation({
    mutationFn: () => api.startCheckersGame(code, authUser ? undefined : session.playerId),
    onSuccess: (nextGame) => {
      queryClient.setQueryData<CheckersGameState>(['battle', code], (previous) => reconcileBattleState(previous, nextGame));
    }
  });
  const battle = game.data;

  useEffect(() => {
    return () => {
      if (botDelayTimer.current) window.clearTimeout(botDelayTimer.current);
      if (traceTimer.current) window.clearTimeout(traceTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!battle) return;
    const human = authUser
      ? battle.players.find((player) => player.userId === authUser.userId && !player.isBot)
      : battle.players.find((player) => player.playerId === session.playerId && !player.isBot);
    if (!human) return;
    const current = getSession();
    if (current.playerId !== human.playerId || current.code !== code) {
      saveSession({ code, playerId: human.playerId, playerName: human.name });
    }
  }, [battle, authUser, code, session.playerId]);

  useEffect(() => {
    if (botDelayTimer.current) {
      window.clearTimeout(botDelayTimer.current);
      botDelayTimer.current = null;
    }
    if (!battle) return;
    const bot = battle.players.find((player) => player.isBot && player.color === battle.turn);
    if (battle.status !== 'active' || !bot || moveMutation.isPending || botTurnMutation.isPending) return;
    const turnKey = `${battle.turnNumber}:${battle.turn}:${battle.forcedPieceId ?? '-'}`;
    if (botActedForTurn.current === turnKey) return;

    setBotDelayActive(true);
    botDelayTimer.current = window.setTimeout(() => {
      botDelayTimer.current = null;
      setBotDelayActive(false);
      botActedForTurn.current = turnKey;
      botTurnMutation.mutate();
    }, BOT_DELAY_MS);

    return () => {
      if (botDelayTimer.current) {
        window.clearTimeout(botDelayTimer.current);
        botDelayTimer.current = null;
      }
    };
  }, [battle, moveMutation.isPending, botTurnMutation.isPending, botTurnMutation.mutate]);

  const displayBattle = battle;

  if (game.isLoading) return <LoadingPanel title="Cargando tablero..." />;
  if (!displayBattle) {
    return (
      <main className="bot-entry-screen">
        <section className="bot-entry-card match-start-card">
          <p className="eyebrow">Partida {code}</p>
          <h1>Lista para empezar</h1>
          <p className="bot-entry-copy">El tablero todavia no esta en juego.</p>
          {startMutation.error && (
            <p className="form-error">
              {startMutation.error instanceof Error ? startMutation.error.message : 'No se pudo iniciar la partida.'}
            </p>
          )}
          <button className="bot-entry-submit" disabled={startMutation.isPending} onClick={() => startMutation.mutate()} type="button">
            {startMutation.isPending ? <Loader2 className="spin" size={18} /> : <Bot size={18} />}
            Empezar partida
          </button>
          <button className="secondary-button" onClick={() => navigate({ to: '/' })} type="button">
            <Home size={18} />
            Volver al inicio
          </button>
        </section>
      </main>
    );
  }

  const me = displayBattle.players.find((player) => player.playerId === session.playerId);
  const winner = displayBattle.players.find((player) => player.playerId === displayBattle.winnerPlayerId);
  const myTurn = me?.color === displayBattle.turn && displayBattle.status === 'active';
  const sessionInvalid = !me;
  const redPieces = displayBattle.board.filter((piece) => piece.color === 'red').length;
  const blackPieces = displayBattle.board.filter((piece) => piece.color === 'black').length;
  const title =
    sessionInvalid ? 'Reingresa a la partida'
    : displayBattle.status === 'finished' && displayBattle.result === 'draw' ? 'Empate'
    : displayBattle.status === 'finished' ? `${winner?.name ?? 'Alguien'} gana`
    : botDelayActive ? 'La computadora prepara su jugada...'
    : botTurnMutation.isPending ? 'La computadora calcula...'
    : displayBattle.forcedPieceId ? 'Captura otra vez'
    : myTurn ? 'Tu turno' : 'Turno rival';

  function leaveRoom() {
    clearSession();
    void navigate({ to: '/' });
  }

  return (
    <main className="checkers-game-screen">
      <header className="game-topbar">
        <div>
          <p className="eyebrow">Partida {code}</p>
          <h1>{title}</h1>
          <div className="game-status-strip">
            <span>Turno {displayBattle.turn === 'red' ? 'rojas' : 'negras'}</span>
            <span>Rojas {redPieces}/12</span>
            <span>Negras {blackPieces}/12</span>
            <span>Mov. {displayBattle.moveCount}</span>
            <span className="ai-engine-badge astar">A*</span>
            {displayBattle.forcedPieceId && <strong>Captura obligatoria</strong>}
            {displayBattle.drawReason && <strong>{displayBattle.drawReason}</strong>}
          </div>
        </div>
        <div className="game-actions">
          {displayBattle.status === 'finished' && (
            <button className="secondary-button" disabled={restartMutation.isPending} onClick={() => restartMutation.mutate()} type="button">
              {restartMutation.isPending ? <Loader2 className="spin" size={18} /> : <RotateCcw size={18} />}
              Reiniciar
            </button>
          )}
          <button className="secondary-button" onClick={() => resignMutation.mutate()} disabled={sessionInvalid || displayBattle.status === 'finished' || resignMutation.isPending} type="button">
            {resignMutation.isPending ? <Loader2 className="spin" size={18} /> : <Flag size={18} />}
            Rendirse
          </button>
          <button className="secondary-button" onClick={leaveRoom} type="button">
            <Home size={18} />
            Salir
          </button>
        </div>
      </header>

      <section className="game-layout">
        <aside className="game-side">
          {displayBattle.players.map((player) => (
            <article key={player.playerId} className={`player-card ${player.color}${player.color === displayBattle.turn ? ' active' : ''}`}>
              <span>{player.name}</span>
              <strong>{player.isBot && <Bot size={13} />} {player.color === 'red' ? 'Rojas' : 'Negras'}{player.isBot ? ' computadora' : ''}</strong>
              <small>{player.color === 'red' ? redPieces : blackPieces} fichas en mesa</small>
            </article>
          ))}
          {displayBattle.lastAiMeta && (
            <article className="ai-compare-panel battle-compare">
              <h3>Ultimo calculo</h3>
              <p>
                A*:
                {' '}{displayBattle.lastAiMeta.nodesExplored?.toLocaleString() ?? '—'} nodos
                {displayBattle.lastAiMeta.goalCount !== undefined && ` · rutas ${displayBattle.lastAiMeta.goalCount}`}
                {displayBattle.lastAiMeta.computeTimeMs !== undefined && ` · ${displayBattle.lastAiMeta.computeTimeMs} ms`}
              </p>
              {displayBattle.lastAiMeta.goal && (
                <p className="muted-copy">
                  Meta de ruta: {String.fromCharCode(97 + displayBattle.lastAiMeta.goal.col)}{8 - displayBattle.lastAiMeta.goal.row}
                </p>
              )}
            </article>
          )}
        </aside>

        <div className="game-board-column">
          <CheckersBoard
            game={displayBattle}
            playerId={session.playerId}
            boardTheme={authUser?.boardTheme ?? 'classic'}
            pieceStyle={authUser?.pieceStyle ?? 'sphere'}
            movePending={sessionInvalid || moveMutation.isPending || botDelayActive || botTurnMutation.isPending}
            cpuMoveTrace={cpuMoveTrace}
            onMove={(from, to) => moveMutation.mutate({ from, to })}
          />
          {displayBattle.status === 'finished' && (
            <section className="match-finish-banner" aria-label="Resultado final">
              <p className="eyebrow">Partida terminada</p>
              <h2>
                {displayBattle.result === 'draw'
                  ? 'Empate'
                  : winner
                    ? `${winner.name} gana`
                    : 'Partida finalizada'}
              </h2>
              <p>
                {displayBattle.drawReason
                  ? displayBattle.drawReason
                  : displayBattle.result === 'resign'
                    ? 'La partida termino por rendicion.'
                    : 'Puedes revisar el tablero o comenzar otra partida.'}
              </p>
              <div className="match-finish-actions">
                <button className="primary-button" disabled={restartMutation.isPending} onClick={() => restartMutation.mutate()} type="button">
                  {restartMutation.isPending ? <Loader2 className="spin" size={18} /> : <RotateCcw size={18} />}
                  Jugar otra vez
                </button>
                <button className="secondary-button" onClick={leaveRoom} type="button">
                  <Home size={18} />
                  Volver al inicio
                </button>
              </div>
            </section>
          )}
        </div>

        <aside className="game-side log-panel">
          <h2>Bitacora</h2>
          {sessionInvalid && <p className="form-error">Tu sesion no corresponde a esta partida. Vuelve al inicio e ingresa con tu cuenta.</p>}
          {moveMutation.error && <p className="form-error">{moveMutation.error instanceof Error ? moveMutation.error.message : 'Movimiento invalido.'}</p>}
          {botTurnMutation.error && <p className="form-error">{botTurnMutation.error instanceof Error ? botTurnMutation.error.message : 'No se pudo ejecutar el turno de la computadora.'}</p>}
          {restartMutation.error && <p className="form-error">{restartMutation.error instanceof Error ? restartMutation.error.message : 'No se pudo reiniciar.'}</p>}
          <div className="battle-log-list">
            {displayBattle.log.slice(0, 8).map((entry, index) => (
              <p key={`${entry.createdAt}-${index}`}>{entry.message}</p>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
