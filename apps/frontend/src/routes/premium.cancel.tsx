import { createFileRoute, Link } from '@tanstack/react-router';
import { XCircle } from 'lucide-react';
import { PanelIcon, ScreenShell } from '../components/ScreenShell';

export const Route = createFileRoute('/premium/cancel')({
  component: PremiumCancelPage
});

function PremiumCancelPage() {
  return (
    <ScreenShell backLabel="Arena">
      <section className="command-panel panel-tone-danger">
        <PanelIcon><XCircle size={28} /></PanelIcon>
        <h1>Pago cancelado</h1>
        <Link className="secondary-button panel-submit" to="/premium">Volver al pase</Link>
      </section>
    </ScreenShell>
  );
}
