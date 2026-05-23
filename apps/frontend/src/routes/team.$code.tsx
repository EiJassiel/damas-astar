import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Loader2, Play, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { RosterDock } from '../components/RosterDock';
import { ScreenShell } from '../components/ScreenShell';
import { TeamSelector } from '../components/TeamSelector';
import { useRoomPolling } from '../hooks/useRoomPolling';
import { api, getSession } from '../services/api';

export const Route = createFileRoute('/team/$code')({
  component: TeamPage
});

const types = ['', 'fire', 'water', 'grass', 'electric', 'psychic', 'dragon', 'ghost', 'steel', 'fairy'];

function TeamPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const session = getSession();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const room = useRoomPolling(code);
  const catalog = useQuery({
    queryKey: ['pokemon', search, type],
    queryFn: () => api.getPokemon({ search, type, limit: 48 })
  });
  const mutation = useMutation({
    mutationFn: () => api.setTeam(code, session.playerId, selected),
    onSuccess: () => room.refetch()
  });
  const start = useMutation({
    mutationFn: () => api.startBattle(code, session.playerId),
    onSuccess: () => navigate({ to: '/battle/$code', params: { code } })
  });
  const canStart = useMemo(() => room.data?.players.length === 2 && room.data.players.every((player) => player.ready), [room.data]);
  const me = room.data?.players.find((player) => player.playerId === session.playerId);
  const rival = room.data?.players.find((player) => player.playerId !== session.playerId);

  const rosterSlots = useMemo(() => {
    const items = catalog.data?.items ?? [];
    return selected.map((id) => items.find((item) => item.id === id));
  }, [selected, catalog.data?.items]);

  useEffect(() => {
    if (room.data?.status === 'in_battle') navigate({ to: '/battle/$code', params: { code } });
  }, [room.data?.status, code, navigate]);

  useEffect(() => {
    if (canStart && !start.isPending) {
      start.mutate();
    }
  }, [canStart, start]);

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 6 ? [...current, id] : current);
  }

  return (
    <ScreenShell backTo="/" backLabel="Arena" variant="team">
      <header className="team-header">
        <div>
          <h1>Equipo · {code}</h1>
        </div>
        <div className="team-actions">
          <button className="primary-button" disabled={selected.length === 0 || mutation.isPending} onClick={() => mutation.mutate()} type="button">
            {mutation.isPending ? <Loader2 className="spin" size={18} /> : null}
            Guardar {selected.length}/6
          </button>
          <button className="secondary-button" disabled={!canStart || start.isPending} onClick={() => start.mutate()} type="button">
            {start.isPending ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
            {canStart ? 'Entrando a batalla' : 'Esperando rival'}
          </button>
        </div>
      </header>

      <RosterDock slots={rosterSlots} onRemove={toggle} />

      <section className="readiness-strip">
        <span className={me?.ready ? 'ready' : ''}>Tu equipo: {me?.ready ? 'guardado' : 'sin guardar'}</span>
        <span className={rival?.ready ? 'ready' : ''}>Rival: {rival?.name ?? '—'} · {rival?.ready ? 'listo' : 'pendiente'}</span>
        <span className={selected.length === 6 ? 'ready' : ''}>Slots: {selected.length}/6</span>
      </section>

      {(mutation.error || start.error) && (
        <p className="team-error">{(mutation.error ?? start.error) instanceof Error ? (mutation.error ?? start.error)?.message : 'No se pudo completar la accion.'}</p>
      )}

      <section className="filters filters-bar">
        <label className="search-field">
          <Search size={16} />
          <input placeholder="Buscar Pokemon..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filtrar por tipo">
          {types.map((value) => <option key={value} value={value}>{value || 'Todos los tipos'}</option>)}
        </select>
      </section>

      {catalog.isLoading ? (
        <p className="muted catalog-loading"><Loader2 className="spin" size={18} /></p>
      ) : (
        <TeamSelector pokemon={catalog.data?.items ?? []} selectedIds={selected} onToggle={toggle} />
      )}
    </ScreenShell>
  );
}
