export const PIXEL_ART_PATHS = {
  madeira: '/pixel/madeira.svg',
  pedra: '/pixel/pedra.svg',
  machado: '/pixel/machado.svg',
  picareta: '/pixel/picareta.svg',
  machadoDraconico: '/pixel/machado_draconico.svg',
  picaretaDraconica: '/pixel/picareta_draconica.svg',
  machadoCosmico: '/pixel/machado_cosmico.svg',
  picaretaCosmica: '/pixel/picareta_cosmica.svg',
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
