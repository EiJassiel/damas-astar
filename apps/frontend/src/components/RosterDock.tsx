import type { PokemonCatalogItem } from '../types/battle';

export function RosterDock({
  slots,
  onRemove
}: {
  slots: (PokemonCatalogItem | undefined)[];
  onRemove?: (id: string) => void;
}) {
  return (
    <section className="roster-dock" aria-label="Equipo seleccionado">
      <p className="roster-dock-label">Escuadra</p>
      <div className="roster-slots">
        {Array.from({ length: 6 }, (_, index) => {
          const pokemon = slots[index];
          return (
            <button
              key={index}
              className={`roster-slot${pokemon ? ' filled' : ''}`}
              disabled={!pokemon || !onRemove}
              onClick={() => pokemon && onRemove?.(pokemon.id)}
              title={pokemon ? `${pokemon.name} — clic para quitar` : `Slot ${index + 1}`}
              type="button"
            >
              {pokemon ? (
                <>
                  <img src={pokemon.spriteUrl} alt={pokemon.name} />
                  <span>{pokemon.name}</span>
                </>
              ) : (
                <span className="roster-empty">{index + 1}</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
