import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/premium/cancel')({
  component: PremiumCancelPage
});

function PremiumCancelPage() {
  return (
    <main className="form-screen">
      <section className="command-panel">
        <p className="eyebrow">Pago cancelado</p>
        <h1>No se realizo cargo</h1>
        <p className="form-hint">Puedes volver a intentarlo cuando quieras.</p>
        <Link className="secondary-button" to="/premium">Volver al pase</Link>
      </section>
    </main>
  );
}
