import { closeMongo, connectMongo } from '../db/mongo';
import { importPokemon } from '../services/import.service';

await connectMongo();
const limit = Number(Bun.argv[2] ?? 300);
const result = await importPokemon(limit);
console.log(JSON.stringify(result, null, 2));
await closeMongo();
