import { createFileRoute, Link } from '@tanstack/react-router';
import { Check, Crown, Loader2, Palette } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FormFeedback } from '../components/FormFeedback';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const Route = createFileRoute('/premium')({
  component: PremiumPage
});

type CatalogItem = Awaited<ReturnType<typeof api.getCosmeticCatalog>>['items'][number];

function PremiumPage() {
  const { authUser, refresh } = useAuth();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loadingItemId, setLoadingItemId] = useState('');
  const [status, setStatus] = useState(authUser?.premium ? 'Compra registrada en la cuenta.' : 'Elige un cosmetico.');
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCosmeticCatalog()
      .then((result) => setCatalog(result.items))
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar la tienda.'));
  }, []);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get('session_id');
    if (!sessionId || !authUser) return;
    setLoadingItemId('verifying');
    api.verifyPremiumCheckout(sessionId)
      .then(() => {
        setStatus('Compra verificada y cosmetico desbloqueado.');
        return refresh();
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo verificar el pago.'))
      .finally(() => setLoadingItemId(''));
  }, [authUser, refresh]);

  const purchased = useMemo(() => new Set(authUser?.purchasedCosmetics ?? []), [authUser?.purchasedCosmetics]);

  async function checkout(item: CatalogItem) {
    setLoadingItemId(item.id);
    setError('');
    try {
      const result = await api.createCosmeticCheckout(item.id);
      window.location.href = result.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar Stripe Checkout.');
      setLoadingItemId('');
    }
  }

  if (!authUser) {
    return (
      <main className="bot-entry-screen">
        <section className="bot-entry-card">
          <div className="bot-entry-icon"><Crown size={24} /></div>
          <h1>Tienda</h1>
          <p className="bot-entry-copy">Inicia sesion para comprar tableros y fichas en modo prueba.</p>
          <Link className="bot-entry-submit" to="/login">Iniciar sesion</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="bot-entry-screen premium-screen">
      <section className="bot-entry-card premium-card">
        <div className="bot-entry-icon"><Palette size={24} /></div>
        <p className="eyebrow">Stripe test mode</p>
        <h1>Tienda de cosmeticos</h1>
        <p className="bot-entry-copy">Compra tableros y fichas reales para desbloquearlos en tu perfil.</p>
        <p className="muted-copy">{status}</p>
        <FormFeedback error={error} />

        <div className="store-catalog">
          {catalog.map((item) => {
            const unlocked = purchased.has(item.id)
              || (item.kind === 'boardTheme' && authUser.unlockedThemes.includes(item.value as 'classic' | 'wood' | 'neon'))
              || (item.kind === 'pieceStyle' && authUser.unlockedPieceStyles.includes(item.value as 'sphere' | 'flat' | 'marble'));
            return (
              <article key={item.id} className="store-item-card">
                <div className="store-item-head">
                  <strong>{item.name}</strong>
                  <span>{(item.priceCents / 100).toFixed(2)} {item.currency.toUpperCase()}</span>
                </div>
                <p>{item.description}</p>
                <small>{item.kind === 'boardTheme' ? 'Tema de tablero' : 'Estilo de fichas'}</small>
                <button
                  className={unlocked ? 'bot-entry-secondary' : 'bot-entry-submit'}
                  disabled={Boolean(loadingItemId) || unlocked}
                  onClick={() => checkout(item)}
                  type="button"
                >
                  {loadingItemId === item.id ? <Loader2 className="spin" size={18} /> : unlocked ? <Check size={18} /> : <Crown size={18} />}
                  {unlocked ? 'Desbloqueado' : 'Comprar'}
                </button>
              </article>
            );
          })}
        </div>

        <Link className="bot-entry-secondary" to="/profile">Ir al perfil</Link>
      </section>
    </main>
  );
}
