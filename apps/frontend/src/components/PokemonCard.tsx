import { motion } from 'framer-motion';
import type { BattlePokemon, PokemonCatalogItem } from '../types/battle';
import { HealthBar } from './HealthBar';
import { StatusBadge } from './StatusBadge';

export function PokemonCard({
  pokemon,
  selected,
  onSelect,
  disabled
}: {
  pokemon: PokemonCatalogItem;
  selected?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      className={`pokemon-card ${selected ? 'selected' : ''} ${disabled ? 'locked' : ''}`}
      disabled={disabled}
      onClick={onSelect}
      type="button"
      whileHover={disabled ? undefined : { y: -5, scale: 1.018 }}
      whileTap={disabled ? undefined : { scale: 0.965 }}
      transition={{ type: 'spring', stiffness: 380, damping: 24 }}
    >
      <span className="card-scan" aria-hidden="true" />
      <img src={pokemon.spriteUrl} alt={pokemon.name} />
      <strong>{pokemon.name}</strong>
      <span>#{pokemon.pokedexId.toString().padStart(3, '0')}</span>
      <div className="type-row">{pokemon.types.map((type) => <i key={type}>{type}</i>)}</div>
      <dl className="stat-mini">
        <div><dt>HP</dt><dd>{pokemon.baseStats.hp}</dd></div>
        <div><dt>ATK</dt><dd>{pokemon.baseStats.attack}</dd></div>
        <div><dt>DEF</dt><dd>{pokemon.baseStats.defense}</dd></div>
        <div><dt>SPD</dt><dd>{pokemon.baseStats.speed}</dd></div>
      </dl>
      <div className="move-preview" aria-label="Movimientos disponibles">
        {(pokemon.moves ?? []).slice(0, 4).map((move) => (
          <small key={move.moveId}>{move.name}</small>
        ))}
      </div>
    </motion.button>
  );
}

export function BattlePokemonPanel({ pokemon, align = 'left' }: { pokemon: BattlePokemon; align?: 'left' | 'right' }) {
  return (
    <motion.section
      className={`battle-panel ${align} ${pokemon.fainted ? 'fainted' : ''}`}
      key={`${pokemon.pokemonId}-${pokemon.currentHp}-${pokemon.fainted}`}
      initial={{ opacity: 0.72, y: pokemon.fainted ? 0 : 8 }}
      animate={{
        opacity: pokemon.fainted ? 0.58 : 1,
        y: 0,
        x: pokemon.fainted ? 0 : [0, align === 'left' ? 10 : -10, 0],
        scale: pokemon.fainted ? 0.96 : 1
      }}
      transition={{ duration: 0.34 }}
    >
      <div>
        <p className="eyebrow">Lv. {pokemon.level}</p>
        <h2>{pokemon.name}</h2>
        <div className="type-row">{pokemon.types.map((type) => <i key={type}>{type}</i>)}</div>
      </div>
      <img src={pokemon.spriteUrl} alt={pokemon.name} />
      <HealthBar current={pokemon.currentHp} max={pokemon.battleStats.maxHp} />
      <StatusBadge pokemon={pokemon} />
    </motion.section>
  );
}
