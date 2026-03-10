export const PIXEL_ART_PATHS = {
  madeira: '/pixel/madeira.svg',
  pedra: '/pixel/pedra.svg',
  machado: '/pixel/machado.svg',
  picareta: '/pixel/picareta.svg',
  machadoMadeira: '/pixel/machado_madeira.svg',
  machadoPedra: '/pixel/machado_pedra.svg',
  machadoFerro: '/pixel/machado_ferro.svg',
  machadoOuro: '/pixel/machado_ouro.svg',
  machadoDiamante: '/pixel/machado_diamante.svg',
  picaretaMadeira: '/pixel/picareta_madeira.svg',
  picaretaPedra: '/pixel/picareta_pedra.svg',
  picaretaFerro: '/pixel/picareta_ferro.svg',
  picaretaOuro: '/pixel/picareta_ouro.svg',
  picaretaDiamante: '/pixel/picareta_diamante.svg',
  machadoDraconico: '/pixel/machado_draconico.svg',
  picaretaDraconica: '/pixel/picareta_draconica.svg',
  machadoCosmico: '/pixel/machado_cosmico.svg',
  picaretaCosmica: '/pixel/picareta_cosmica.svg',
  humildeCabana: '/pixel/build_humble_hut.svg',
  serrariaRunica: '/pixel/build_lumber_mill.svg',
  oficinaAlquimica: '/pixel/build_alchemist_lab.svg',
  torreArcanista: '/pixel/build_mage_tower.svg',
  fortalezaDraconica: '/pixel/build_dragon_keep.svg',
  forjaCelestial: '/pixel/build_celestial_forge.svg',
  relicario: '/pixel/relicario.svg',
  caixaComum: '/pixel/caixa_comum.svg',
  caixaIncomum: '/pixel/caixa_incomum.svg',
  caixaRara: '/pixel/caixa_rara.svg',
  caixaEpica: '/pixel/caixa_epica.svg',
  caixaLendaria: '/pixel/caixa_lendaria.svg',
  caixaMitica: '/pixel/caixa_mitica.svg',
} as const;

export function getToolPixelArt(toolKey: string): string {
  const key = toolKey.toLowerCase();

  if (key.includes('machado_madeira')) {
    return PIXEL_ART_PATHS.machadoMadeira;
  }

  if (key.includes('machado_pedra')) {
    return PIXEL_ART_PATHS.machadoPedra;
  }

  if (key.includes('machado_ferro')) {
    return PIXEL_ART_PATHS.machadoFerro;
  }

  if (key.includes('machado_ouro')) {
    return PIXEL_ART_PATHS.machadoOuro;
  }

  if (key.includes('machado_diamante')) {
    return PIXEL_ART_PATHS.machadoDiamante;
  }

  if (key.includes('picareta_madeira')) {
    return PIXEL_ART_PATHS.picaretaMadeira;
  }

  if (key.includes('picareta_pedra')) {
    return PIXEL_ART_PATHS.picaretaPedra;
  }

  if (key.includes('picareta_ferro')) {
    return PIXEL_ART_PATHS.picaretaFerro;
  }

  if (key.includes('picareta_ouro')) {
    return PIXEL_ART_PATHS.picaretaOuro;
  }

  if (key.includes('picareta_diamante')) {
    return PIXEL_ART_PATHS.picaretaDiamante;
  }

  if (key.includes('machado_cosmico')) {
    return PIXEL_ART_PATHS.machadoCosmico;
  }

  if (key.includes('picareta_cosmica')) {
    return PIXEL_ART_PATHS.picaretaCosmica;
  }

  if (key.includes('machado_draconico')) {
    return PIXEL_ART_PATHS.machadoDraconico;
  }

  if (key.includes('picareta_draconica')) {
    return PIXEL_ART_PATHS.picaretaDraconica;
  }

  if (key.includes('machado')) {
    return PIXEL_ART_PATHS.machado;
  }

  if (key.includes('picareta')) {
    return PIXEL_ART_PATHS.picareta;
  }

  return PIXEL_ART_PATHS.relicario;
}

export function getBuildingPixelArt(buildingId: string): string {
  const key = buildingId.toLowerCase();

  if (key === 'humble_hut') {
    return PIXEL_ART_PATHS.humildeCabana;
  }

  if (key === 'lumber_mill') {
    return PIXEL_ART_PATHS.serrariaRunica;
  }

  if (key === 'alchemist_lab') {
    return PIXEL_ART_PATHS.oficinaAlquimica;
  }

  if (key === 'mage_tower') {
    return PIXEL_ART_PATHS.torreArcanista;
  }

  if (key === 'dragon_keep') {
    return PIXEL_ART_PATHS.fortalezaDraconica;
  }

  if (key === 'celestial_forge') {
    return PIXEL_ART_PATHS.forjaCelestial;
  }

  return PIXEL_ART_PATHS.relicario;
}

export function getMaterialPixelArt(materialKey: string): string {
  const key = materialKey.toLowerCase();

  if (key.includes('madeira')) {
    return PIXEL_ART_PATHS.madeira;
  }

  if (key.includes('pedra') || key.includes('ferro') || key.includes('obsidiana') || key.includes('minerio')) {
    return PIXEL_ART_PATHS.pedra;
  }

  return PIXEL_ART_PATHS.relicario;
}

export function getBoxPixelArt(rarity: string): string {
  const value = rarity.toLowerCase();

  if (value === 'incomum') {
    return PIXEL_ART_PATHS.caixaIncomum;
  }

  if (value === 'raro') {
    return PIXEL_ART_PATHS.caixaRara;
  }

  if (value === 'epico') {
    return PIXEL_ART_PATHS.caixaEpica;
  }

  if (value === 'lendario') {
    return PIXEL_ART_PATHS.caixaLendaria;
  }

  if (value === 'mitico') {
    return PIXEL_ART_PATHS.caixaMitica;
  }

  return PIXEL_ART_PATHS.caixaComum;
}
