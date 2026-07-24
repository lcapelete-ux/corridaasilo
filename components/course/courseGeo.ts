// Utilidades geográficas do percurso — feitas à mão (leves) no lugar do Turf,
// para não inflar o bundle. Trabalham sobre os dados já pré-computados em
// courseData.ts (coords + distância acumulada).

import { COURSE } from './courseData';

export type LngLat = [number, number];

// Ponto [lon, lat] e elevação na posição `progress` (0..1) do percurso.
// Interpola linearmente entre os dois pontos que cercam a distância alvo —
// suaviza o movimento do marcador mesmo com pontos espaçados.
export function pointAtProgress(progress: number): { lngLat: LngLat; ele: number; index: number } {
  const p = Math.max(0, Math.min(1, progress));
  const target = p * COURSE.totalMeters;
  const cum = COURSE.cumMeters;
  const coords = COURSE.coords;

  // Busca binária pelo segmento que contém a distância alvo
  let lo = 0, hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < target) lo = mid + 1; else hi = mid;
  }
  const i = Math.max(1, lo);
  const segStart = cum[i - 1];
  const segEnd = cum[i];
  const t = segEnd > segStart ? (target - segStart) / (segEnd - segStart) : 0;

  const a = coords[i - 1];
  const b = coords[i];
  return {
    lngLat: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
    ele: a[2] + (b[2] - a[2]) * t,
    index: i,
  };
}

// Rumo (graus, 0=N) de `from` para `to` — orienta a câmera na direção do trajeto
export function bearing(from: LngLat, to: LngLat): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const y = Math.sin(toRad(to[0] - from[0])) * Math.cos(toRad(to[1]));
  const x =
    Math.cos(toRad(from[1])) * Math.sin(toRad(to[1])) -
    Math.sin(toRad(from[1])) * Math.cos(toRad(to[1])) * Math.cos(toRad(to[0] - from[0]));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Rumo médio um pouco à frente do marcador (evita a câmera "tremer" nas curvas)
export function bearingAhead(progress: number, lookahead = 0.02): number {
  const a = pointAtProgress(progress);
  const b = pointAtProgress(Math.min(1, progress + lookahead));
  return bearing(a.lngLat, b.lngLat);
}

// GeoJSON LineString do percurso inteiro (para as camadas do mapa)
export function fullLineGeoJSON(): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: COURSE.coords.map(c => [c[0], c[1]]) },
  };
}

// GeoJSON só do trecho já percorrido (0..progress) — cresce durante a animação
export function traveledLineGeoJSON(progress: number): GeoJSON.Feature<GeoJSON.LineString> {
  const p = Math.max(0, Math.min(1, progress));
  const target = p * COURSE.totalMeters;
  const line: LngLat[] = [];
  for (let i = 0; i < COURSE.coords.length; i++) {
    if (COURSE.cumMeters[i] <= target) {
      line.push([COURSE.coords[i][0], COURSE.coords[i][1]]);
    } else break;
  }
  const tip = pointAtProgress(p).lngLat;
  if (line.length === 0) line.push(tip);
  else line.push(tip); // fecha exatamente na ponta interpolada
  return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } };
}

// Marcos de quilômetro (1, 2, 3, ...) como pontos GeoJSON, para os rótulos no mapa
export function kilometerMarkers(): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
  const totalKm = Math.floor(COURSE.totalMeters / 1000);
  for (let km = 1; km <= totalKm; km++) {
    const { lngLat } = pointAtProgress((km * 1000) / COURSE.totalMeters);
    features.push({
      type: 'Feature',
      properties: { label: `${km}` },
      geometry: { type: 'Point', coordinates: lngLat },
    });
  }
  return { type: 'FeatureCollection', features };
}

// Easing suave (ease-in-out cúbico) para acelerações naturais
export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Formata metros como "1,2 km" ou "850 m"
export const fmtDistance = (meters: number): string =>
  meters >= 1000 ? `${(meters / 1000).toFixed(2).replace('.', ',')} km` : `${Math.round(meters)} m`;
