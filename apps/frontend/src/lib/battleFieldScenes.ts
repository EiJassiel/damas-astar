export type FieldAccent = 'grass' | 'water' | 'sand' | 'rock' | 'snow' | 'cave' | 'lava' | 'meadow';

export type FieldScene = {
  sky: [string, string, string];
  sun: boolean;
  sunColor: string;
  hillFar: string;
  hillNear: string;
  ground: [string, string];
  accent: FieldAccent;
  clouds: boolean;
  trees: boolean;
  indoor: boolean;
  platformTop: string;
  platformShadow: string;
  platformRim: string;
};

export const FIELD_SCENES: Record<string, FieldScene> = {
  stadium: {
    sky: ['#2a2858', '#4a4898', '#6868b8'],
    sun: true,
    sunColor: '#ffe8a0',
    hillFar: '#484878',
    hillNear: '#383868',
    ground: ['#585898', '#404070'],
    accent: 'meadow',
    clouds: true,
    trees: false,
    indoor: false,
    platformTop: '#ffd166',
    platformShadow: '#b89030',
    platformRim: '#987020'
  },
  normal: {
    sky: ['#5eb0f0', '#87c8f5', '#b8dff8'],
    sun: true,
    sunColor: '#fff4b0',
    hillFar: '#4a9848',
    hillNear: '#3d8440',
    ground: ['#6cb050', '#489038'],
    accent: 'meadow',
    clouds: true,
    trees: true,
    indoor: false,
    platformTop: '#8ec878',
    platformShadow: '#5a9850',
    platformRim: '#488040'
  },
  grass: {
    sky: ['#4898e0', '#78b8f0', '#a8d0f8'],
    sun: true,
    sunColor: '#fff4b0',
    hillFar: '#3d9040',
    hillNear: '#2f7832',
    ground: ['#58a848', '#388830'],
    accent: 'grass',
    clouds: true,
    trees: true,
    indoor: false,
    platformTop: '#7bc96f',
    platformShadow: '#4a8838',
    platformRim: '#3d7a32'
  },
  bug: {
    sky: ['#4898e0', '#78b8f0', '#a8d0f8'],
    sun: true,
    sunColor: '#fff4b0',
    hillFar: '#448838',
    hillNear: '#367030',
    ground: ['#58a040', '#387828'],
    accent: 'grass',
    clouds: true,
    trees: true,
    indoor: false,
    platformTop: '#88b858',
    platformShadow: '#588838',
    platformRim: '#487828'
  },
  water: {
    sky: ['#4898d8', '#78b8e8', '#a0d0f0'],
    sun: true,
    sunColor: '#fff4b0',
    hillFar: '#388858',
    hillNear: '#286848',
    ground: ['#58a8d0', '#3888b0'],
    accent: 'water',
    clouds: true,
    trees: false,
    indoor: false,
    platformTop: '#d4b896',
    platformShadow: '#a08060',
    platformRim: '#887050'
  },
  fire: {
    sky: ['#e87840', '#f0a060', '#f8c890'],
    sun: true,
    sunColor: '#ffd080',
    hillFar: '#8a5840',
    hillNear: '#684030',
    ground: ['#a86840', '#784828'],
    accent: 'lava',
    clouds: true,
    trees: false,
    indoor: false,
    platformTop: '#b89068',
    platformShadow: '#7a5538',
    platformRim: '#6a4830'
  },
  electric: {
    sky: ['#687898', '#8898b0', '#a8b8c8'],
    sun: false,
    sunColor: '#fff8c0',
    hillFar: '#508848',
    hillNear: '#386830',
    ground: ['#689048', '#487030'],
    accent: 'meadow',
    clouds: true,
    trees: true,
    indoor: false,
    platformTop: '#c8b860',
    platformShadow: '#988840',
    platformRim: '#807030'
  },
  ice: {
    sky: ['#c0d8e8', '#d8e8f0', '#e8f0f8'],
    sun: true,
    sunColor: '#fffef0',
    hillFar: '#a0c0d0',
    hillNear: '#88a8b8',
    ground: ['#d8e8f0', '#b0c8d8'],
    accent: 'snow',
    clouds: true,
    trees: false,
    indoor: false,
    platformTop: '#e8f0f8',
    platformShadow: '#b0c8d8',
    platformRim: '#98b0c0'
  },
  fighting: {
    sky: ['#88b0d0', '#a8c8e0', '#c0d8e8'],
    sun: true,
    sunColor: '#fff4b0',
    hillFar: '#987848',
    hillNear: '#785838',
    ground: ['#c0a060', '#987840'],
    accent: 'sand',
    clouds: true,
    trees: false,
    indoor: false,
    platformTop: '#c8a878',
    platformShadow: '#987848',
    platformRim: '#806838'
  },
  ground: {
    sky: ['#88b0d0', '#a8c8e0', '#c0d8e8'],
    sun: true,
    sunColor: '#fff4b0',
    hillFar: '#987848',
    hillNear: '#785838',
    ground: ['#c0a060', '#987840'],
    accent: 'sand',
    clouds: true,
    trees: false,
    indoor: false,
    platformTop: '#c8a060',
    platformShadow: '#987040',
    platformRim: '#806030'
  },
  poison: {
    sky: ['#7868a0', '#9888b8', '#b8a8c8'],
    sun: false,
    sunColor: '#d0b0ff',
    hillFar: '#508848',
    hillNear: '#386830',
    ground: ['#608848', '#406830'],
    accent: 'grass',
    clouds: true,
    trees: true,
    indoor: false,
    platformTop: '#8a78a8',
    platformShadow: '#605080',
    platformRim: '#504070'
  },
  flying: {
    sky: ['#3890e0', '#68b0e8', '#98ccf0'],
    sun: true,
    sunColor: '#fff4b0',
    hillFar: '#68a848',
    hillNear: '#488838',
    ground: ['#78b858', '#589840'],
    accent: 'meadow',
    clouds: true,
    trees: false,
    indoor: false,
    platformTop: '#98c878',
    platformShadow: '#689848',
    platformRim: '#588838'
  },
  psychic: {
    sky: ['#c088c0', '#d8a8d0', '#e8c8e0'],
    sun: true,
    sunColor: '#ffe0f0',
    hillFar: '#88a868',
    hillNear: '#688848',
    ground: ['#98c878', '#78a858'],
    accent: 'meadow',
    clouds: true,
    trees: true,
    indoor: false,
    platformTop: '#c898c8',
    platformShadow: '#986898',
    platformRim: '#805880'
  },
  fairy: {
    sky: ['#e8a8d8', '#f0c0e0', '#f8d8e8'],
    sun: true,
    sunColor: '#ffe8f0',
    hillFar: '#98c878',
    hillNear: '#78a858',
    ground: ['#a8d888', '#88b868'],
    accent: 'meadow',
    clouds: true,
    trees: true,
    indoor: false,
    platformTop: '#f0b8d0',
    platformShadow: '#c088a8',
    platformRim: '#a87098'
  },
  rock: {
    sky: ['#686058', '#887870', '#a89888'],
    sun: false,
    sunColor: '#d0c8b8',
    hillFar: '#585048',
    hillNear: '#484038',
    ground: ['#908878', '#706860'],
    accent: 'cave',
    clouds: false,
    trees: false,
    indoor: true,
    platformTop: '#a89888',
    platformShadow: '#786858',
    platformRim: '#685848'
  },
  ghost: {
    sky: ['#403848', '#585068', '#706878'],
    sun: false,
    sunColor: '#b0a0c8',
    hillFar: '#484050',
    hillNear: '#383040',
    ground: ['#585060', '#403848'],
    accent: 'cave',
    clouds: false,
    trees: false,
    indoor: true,
    platformTop: '#787098',
    platformShadow: '#504868',
    platformRim: '#403858'
  },
  dark: {
    sky: ['#302838', '#484050', '#605868'],
    sun: false,
    sunColor: '#908898',
    hillFar: '#403840',
    hillNear: '#302830',
    ground: ['#504850', '#383040'],
    accent: 'cave',
    clouds: false,
    trees: false,
    indoor: true,
    platformTop: '#686068',
    platformShadow: '#484048',
    platformRim: '#383038'
  },
  steel: {
    sky: ['#686870', '#888890', '#a8a8b0'],
    sun: false,
    sunColor: '#d0d8e0',
    hillFar: '#686870',
    hillNear: '#585860',
    ground: ['#909098', '#707078'],
    accent: 'rock',
    clouds: false,
    trees: false,
    indoor: true,
    platformTop: '#a8b0b8',
    platformShadow: '#788088',
    platformRim: '#687078'
  },
  dragon: {
    sky: ['#5848a0', '#7868b8', '#9888c8'],
    sun: true,
    sunColor: '#ffd0e0',
    hillFar: '#487848',
    hillNear: '#386030',
    ground: ['#689048', '#487030'],
    accent: 'meadow',
    clouds: true,
    trees: true,
    indoor: false,
    platformTop: '#9888c8',
    platformShadow: '#685898',
    platformRim: '#584880'
  }
};

export function getFieldScene(type: string): FieldScene {
  return FIELD_SCENES[type.toLowerCase()] ?? FIELD_SCENES.normal;
}
