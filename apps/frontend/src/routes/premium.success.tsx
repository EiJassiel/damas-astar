import { createFileRoute, Link } from '@tanstack/react-router';
import { Sparkles } from 'lucide-react';

export const Route = createFileRoute('/premium/success')({
  component: PremiumSuccessPage
});

function PremiumSuccessPage() {
  return (
    <main className="form-screen">
      <section className="command-panel premium-panel">
        <p className="eyebrow">Pago confirmado</p>
        <h1>Premium activado</h1>
        <div className="premium-icon"><Sparkles size={34} /></div>
        <p className="form-hint">Stripe acepto el pago. Si el webhook esta activo, tu usuario queda marcado como premium en MongoDB.</p>
        <Link className="primary-button" to="/">Volver al juego</Link>
      </section>
    </main>
  );
}
