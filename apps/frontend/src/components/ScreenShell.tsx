import { Link } from '@tanstack/react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

export function ScreenShell({
  children,
  backTo = '/',
  backLabel = 'Inicio',
  variant = 'form'
}: {
  children: ReactNode;
  backTo?: string;
  backLabel?: string;
  variant?: 'form' | 'team';
}) {
  return (
    <main className={variant === 'team' ? 'team-screen screen-shell' : 'form-screen screen-shell'}>
      <div className="screen-aurora" aria-hidden="true" />
      <div className="screen-orbs" aria-hidden="true">
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
      </div>
      <Link className="screen-back" to={backTo}>
        <ArrowLeft size={16} />
        {backLabel}
      </Link>
      {children}
    </main>
  );
}

export function PanelIcon({ children }: { children: ReactNode }) {
  return <div className="panel-icon">{children}</div>;
}

export function StatusPanel({
  eyebrow,
  title,
  children,
  tone = 'default',
  wide
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  tone?: 'default' | 'premium' | 'success' | 'danger';
  wide?: boolean;
}) {
  return (
    <section className={`command-panel panel-tone-${tone}${wide ? ' command-panel-wide' : ''}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children}
    </section>
  );
}

export function LoadingPanel({ title }: { title: string }) {
  return (
    <ScreenShell>
      <section className="command-panel">
        <h1>{title}</h1>
        <p className="muted auth-loading">
          <Loader2 className="spin" size={18} />
        </p>
      </section>
    </ScreenShell>
  );
}
