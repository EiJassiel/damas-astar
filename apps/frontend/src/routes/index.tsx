import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, DoorOpen, Plus, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="home-screen">
      <section className="hero">
        <p className="eyebrow">1P vs 1P · backend-authoritative</p>
        <h1>Pokemon Battle Rooms</h1>
        <p className="hero-copy">
          Crea una sala, arma un equipo y deja que el motor resuelva cada turno
          con dano, tipos, estados y logs persistentes.
        </p>
        <div className="hero-actions">
          <Link className="primary-button" to="/solo">
            <Bot size={20} />
            Modo solitario
          </Link>
          <Link className="primary-button" to="/create-room">
            <Plus size={20} />
            Crear sala
          </Link>
          <Link className="secondary-button" to="/join-room">
            <DoorOpen size={20} />
            Unirse
          </Link>
          <Link className="secondary-button" to="/premium">
            <Sparkles size={20} />
            Pase Premium
          </Link>
        </div>
      </section>
      <div className="hero-visual" aria-hidden="true">
        <span className="hero-platform" />
        <img
          src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/20.png"
          alt=""
        />
      </div>
    </main>
  );
}
