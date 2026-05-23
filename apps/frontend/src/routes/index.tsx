import { createFileRoute, Link } from "@tanstack/react-router";
import { Crown, DoorOpen, Plus, Sparkles } from "lucide-react";
import { useAuthUser } from "../context/AuthContext";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { authUser, premium, premiumLoading } = useAuthUser();

  return (
    <main className="home-screen">
      <div className="home-aurora" aria-hidden="true" />
      <div className="home-orbs" aria-hidden="true">
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
      </div>

      <section className="hero">
        <h1>
          <span className="hero-title-accent">Pokemon</span> Battle Rooms
        </h1>

        {authUser && premium && !premiumLoading && (
          <div className="home-premium-banner home-premium-banner-active">
            <Crown size={18} />
            <strong>Premium activo</strong>
          </div>
        )}

        {authUser && !premium && !premiumLoading && (
          <div className="home-premium-banner">
            <Sparkles size={18} />
            <strong>Trainer Premium Pass</strong>
            <Link className="secondary-button home-premium-cta" to="/premium">
              Ver pase
            </Link>
          </div>
        )}

        <div className="hero-actions">
          <Link className="primary-button hero-cta-main" to="/create-room">
            <Plus size={20} />
            Crear sala
          </Link>
          <Link className="secondary-button" to="/join-room">
            <DoorOpen size={20} />
            Unirse
          </Link>
          <Link className={`secondary-button premium-link${premium ? ' premium-link-active' : ''}`} to="/premium">
            {premium ? <Crown size={20} /> : <Sparkles size={20} />}
            {premium ? 'Premium' : 'Pase Premium'}
          </Link>
        </div>
      </section>

      <div className="hero-visual" aria-hidden="true">
        <span className="hero-ring hero-ring-outer" />
        <span className="hero-ring hero-ring-inner" />
        <span className="hero-platform" />
        <img
          className="hero-mascot"
          src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png"
          alt=""
        />
        <img
          className="hero-mascot hero-mascot-alt"
          src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png"
          alt=""
        />
      </div>
    </main>
  );
}
