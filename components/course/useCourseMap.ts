import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { COURSE } from './courseData';
import {
  fullLineGeoJSON,
  traveledLineGeoJSON,
  kilometerMarkers,
  pointAtProgress,
  bearingAhead,
  LngLat,
} from './courseGeo';

const START: LngLat = [COURSE.coords[0][0], COURSE.coords[0][1]];
const FINISH: LngLat = [
  COURSE.coords[COURSE.coords.length - 1][0],
  COURSE.coords[COURSE.coords.length - 1][1],
];

// Estilo MapLibre com base escura da Esri ("Dark Gray Canvas"): mostra as ruas
// e é gratuito, sem conta, sem chave de API, sem cartão. Duas camadas: a base
// (ruas/quadras) e a de referência (nomes de ruas). Atribuição incluída.
const ATTRIB = 'Esri · HERE · Garmin · © OpenStreetMap contributors';
const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'esri-dark': {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 16,
      attribution: ATTRIB,
    },
    'esri-dark-ref': {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 16,
    },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#0b1120' } },
    { id: 'esri-dark', type: 'raster', source: 'esri-dark' },
    { id: 'esri-dark-ref', type: 'raster', source: 'esri-dark-ref' },
  ],
};

function makeMarkerEl(kind: 'start' | 'finish' | 'km' | 'tip', label?: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = `course-marker course-marker--${kind}`;
  if (label) el.textContent = label;
  return el;
}

export interface CourseMapApi {
  ready: boolean;
  failed: boolean;
  flyToStart: (onArrive?: () => void) => void;
  setProgress: (p: number, follow: boolean) => void;
  zoomOutFinish: () => void;
  showOverview: () => void;
}

// Encapsula o mapa (MapLibre + CARTO dark): camadas da rota, marcadores e
// câmera. Devolve uma API imperativa para o container conduzir a experiência.
export function useCourseMap(containerRef: React.RefObject<HTMLDivElement>): CourseMapApi {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const tipMarkerRef = useRef<maplibregl.Marker | null>(null);
  const smoothBearingRef = useRef<number>(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: DARK_STYLE,
        center: COURSE.center,
        zoom: 13.5,
        pitch: 45,
        bearing: 0,
        antialias: true,
        attributionControl: false,
      });
    } catch {
      setFailed(true);
      return;
    }
    mapRef.current = map;
    map.addControl(
      new maplibregl.AttributionControl({ compact: true, customAttribution: ATTRIB }),
      'bottom-left',
    );

    // Se os tiles/rede falharem por completo, sinaliza para o container
    let loaded = false;
    const failTimer = setTimeout(() => { if (!loaded) setFailed(true); }, 12000);

    map.on('load', () => {
      loaded = true;
      clearTimeout(failTimer);
      try {
        // Atmosfera (céu) — dá profundidade ao pitch alto
        try {
          (map as any).setSky?.({
            'sky-color': '#0b1226',
            'horizon-color': '#1e293b',
            'fog-color': '#0f172a',
            'sky-horizon-blend': 0.6,
            'horizon-fog-blend': 0.5,
            'fog-ground-blend': 0.4,
          });
        } catch { /* setSky pode não existir em versões antigas */ }

        map.addSource('route-full', { type: 'geojson', data: fullLineGeoJSON() });
        map.addSource('route-traveled', { type: 'geojson', data: traveledLineGeoJSON(0) });

        map.addLayer({
          id: 'route-full-line', type: 'line', source: 'route-full',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#475569', 'line-width': 3, 'line-opacity': 0.7 },
        });
        map.addLayer({
          id: 'route-traveled-glow', type: 'line', source: 'route-traveled',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#22c55e', 'line-width': 14, 'line-opacity': 0.35, 'line-blur': 12 },
        });
        map.addLayer({
          id: 'route-traveled-line', type: 'line', source: 'route-traveled',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#4ade80', 'line-width': 5 },
        });

        new maplibregl.Marker({ element: makeMarkerEl('start'), anchor: 'center' }).setLngLat(START).addTo(map);
        new maplibregl.Marker({ element: makeMarkerEl('finish'), anchor: 'center' }).setLngLat(FINISH).addTo(map);
        kilometerMarkers().features.forEach(f => {
          const [lon, lat] = f.geometry.coordinates as [number, number];
          new maplibregl.Marker({ element: makeMarkerEl('km', String(f.properties?.label)), anchor: 'center' })
            .setLngLat([lon, lat]).addTo(map);
        });
        tipMarkerRef.current = new maplibregl.Marker({ element: makeMarkerEl('tip'), anchor: 'center' })
          .setLngLat(START).addTo(map);

        smoothBearingRef.current = bearingAhead(0);
        setReady(true);
      } catch {
        setFailed(true);
      }
    });

    map.on('error', () => {/* falhas de tile individuais não derrubam a UI */});

    return () => {
      clearTimeout(failTimer);
      tipMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Voo cinematográfico até a largada: inclina ~60°, gira e para sobre o início
  const flyToStart = (onArrive?: () => void) => {
    const map = mapRef.current;
    if (!map) { onArrive?.(); return; }
    const startBearing = bearingAhead(0);
    smoothBearingRef.current = startBearing;
    map.flyTo({ center: START, zoom: 16, pitch: 60, bearing: startBearing, duration: 4200, curve: 1.6, essential: true });
    map.once('moveend', () => onArrive?.());
    setTimeout(() => onArrive?.(), 4600); // fallback caso o moveend não dispare
  };

  // Atualiza marcador + trecho percorrido; opcionalmente segue com a câmera
  const setProgress = (p: number, follow: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    const { lngLat } = pointAtProgress(p);
    tipMarkerRef.current?.setLngLat(lngLat);

    const src = map.getSource('route-traveled') as maplibregl.GeoJSONSource | undefined;
    src?.setData(traveledLineGeoJSON(p));

    if (follow && p < 1) {
      const targetBearing = bearingAhead(p);
      let diff = targetBearing - smoothBearingRef.current;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      smoothBearingRef.current = (smoothBearingRef.current + diff * 0.1 + 360) % 360;
      map.jumpTo({ center: lngLat, bearing: smoothBearingRef.current, pitch: 60, zoom: 16 });
    }
  };

  const zoomOutFinish = () => {
    mapRef.current?.fitBounds(
      [[COURSE.bbox[0], COURSE.bbox[1]], [COURSE.bbox[2], COURSE.bbox[3]]],
      { padding: 80, pitch: 40, bearing: 0, duration: 2600 },
    );
  };

  const showOverview = () => {
    mapRef.current?.fitBounds(
      [[COURSE.bbox[0], COURSE.bbox[1]], [COURSE.bbox[2], COURSE.bbox[3]]],
      { padding: 70, pitch: 40, bearing: 0, duration: 0 },
    );
  };

  return { ready: ready && !failed, failed, flyToStart, setProgress, zoomOutFinish, showOverview };
}
