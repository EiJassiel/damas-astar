import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import type { PokemonCatalogItem } from '../types/battle';
import { PokemonCard } from './PokemonCard';

export function TeamSelector({
  pokemon,
  selectedIds,
  onToggle
}: {
  pokemon: PokemonCatalogItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <motion.div
      className="catalog-grid"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.035 } }
      }}
    >
      {pokemon.map((item) => {
        const selected = selectedIds.includes(item.id);
        const locked = selectedIds.length >= 6 && !selected;
        return (
          <motion.div
            className={`select-wrap ${selected ? 'is-selected' : ''} ${locked ? 'is-locked' : ''}`}
            key={item.id}
            variants={{
              hidden: { opacity: 0, y: 14, scale: 0.96 },
              show: { opacity: 1, y: 0, scale: 1 }
            }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <PokemonCard pokemon={item} selected={selected} disabled={locked} onSelect={() => onToggle(item.id)} />
            {selected && (
              <motion.span className="check" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}>
                <Check size={16} />
              </motion.span>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
