import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
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

// Cria um elemento DOM estilizado para um marcador (largada/chegada/km/ponta)
function makeMarkerEl(kind: 'start' | 'finish' | 'km' | 'tip', label?: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = `course-marker course-marker--${kind}`;
  if (label) el.textContent = label;
  return el;
}

export interface CourseMapApi {
  ready: boolean;
  flyToStart: (onArrive?: () => void) => void;
  setProgress: (p: number, follow: boolean) => void;
  zoomOutFinish: () => void;
  showOverview: () => void;
}

// Encapsula toda a lógica do Mapbox: inicialização (dark + terreno + atmosfera),
// camadas da rota, marcadores e movimentação de câmera. Devolve uma API
// imperativa para o container conduzir a experiência.
export function useMapboxCourse(
  containerRef: React.RefObject<HTMLDivElement>,
  token: string | undefined,
): CourseMapApi {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const tipMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const smoothBearingRef = useRef<number>(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;
    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: COURSE.center,
        zoom: 13.5,
        pitch: 45,
        bearing: 0,
        antialias: true,
        attributionControl: false,
        cooperativeGestures: false,
      });
    } catch {
      setError(true);
      return;
    }
    mapRef.current = map;

    map.on('error', () => {/* tiles/rede podem falhar — não derruba a UI */});

    map.on('load', () => {
      try {
        // Terreno 3D (quando o DEM estiver disponível) + atmosfera
        if (!map.getSource('mapbox-dem')) {
          map.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14,
          });
        }
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.4 });
        map.setFog({
          color: 'rgb(15, 23, 42)',
          'high-color': 'rgb(30, 41, 90)',
          'horizon-blend': 0.2,
          'space-color': 'rgb(2, 6, 23)',
          'star-intensity': 0.5,
        });

        // Fonte da rota completa + trecho percorrido
        map.addSource('route-full', { type: 'geojson', data: fullLineGeoJSON() });
        map.addSource('route-traveled', { type: 'geojson', data: traveledLineGeoJSON(0) });

        // Rota completa: traço fino e apagado (contexto do trajeto)
        map.addLayer({
          id: 'route-full-line',
          type: 'line',
          source: 'route-full',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#334155', 'line-width': 3, 'line-opacity': 0.6 },
        });
        // Glow do trecho percorrido (linha larga e borrada por baixo)
        map.addLayer({
          id: 'route-traveled-glow',
          type: 'line',
          source: 'route-traveled',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#22c55e', 'line-width': 14, 'line-opacity': 0.35, 'line-blur': 12 },
        });
        // Trecho percorrido: linha nítida por cima
        map.addLayer({
          id: 'route-traveled-line',
          type: 'line',
          source: 'route-traveled',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#4ade80', 'line-width': 5 },
        });

        // Marcadores de largada e chegada (DOM)
        new mapboxgl.Marker({ element: makeMarkerEl('start'), anchor: 'center' })
          .setLngLat(START).addTo(map);
        new mapboxgl.Marker({ element: makeMarkerEl('finish'), anchor: 'center' })
          .setLngLat(FINISH).addTo(map);

        // Marcadores de quilômetro
        kilometerMarkers().features.forEach(f => {
          const [lon, lat] = f.geometry.coordinates as [number, number];
          new mapboxgl.Marker({ element: makeMarkerEl('km', String(f.properties?.label)), anchor: 'center' })
            .setLngLat([lon, lat]).addTo(map);
        });

        // Ponta animada (marcador verde com glow)
        tipMarkerRef.current = new mapboxgl.Marker({ element: makeMarkerEl('tip'), anchor: 'center' })
          .setLngLat(START).addTo(map);

        smoothBearingRef.current = bearingAhead(0);
        setReady(true);
      } catch {
        setError(true);
      }
    });

    return () => {
      tipMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Voo cinematográfico até a largada: inclina ~60°, gira e para sobre o início
  const flyToStart = (onArrive?: () => void) => {
    const map = mapRef.current;
    if (!map) { onArrive?.(); return; }
    const startBearing = bearingAhead(0);
    smoothBearingRef.current = startBearing;
    map.flyTo({
      center: START,
      zoom: 16,
      pitch: 60,
      bearing: startBearing,
      duration: 4200,
      curve: 1.6,
      essential: true,
    });
    map.once('moveend', () => onArrive?.());
    // fallback caso o moveend não dispare (sem tiles/rede)
    setTimeout(() => onArrive?.(), 4600);
  };

  // Atualiza marcador + trecho percorrido; opcionalmente segue com a câmera
  const setProgress = (p: number, follow: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    const { lngLat } = pointAtProgress(p);
    tipMarkerRef.current?.setLngLat(lngLat);

    const src = map.getSource('route-traveled') as mapboxgl.GeoJSONSource | undefined;
    src?.setData(traveledLineGeoJSON(p));

    if (follow && p < 1) {
      // Suaviza o rumo para a câmera não "tremer" nas curvas
      const targetBearing = bearingAhead(p);
      let diff = targetBearing - smoothBearingRef.current;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      smoothBearingRef.current = (smoothBearingRef.current + diff * 0.1 + 360) % 360;
      map.jumpTo({ center: lngLat, bearing: smoothBearingRef.current, pitch: 60, zoom: 16 });
    }
  };

  // Zoom out final para enquadrar o percurso inteiro
  const zoomOutFinish = () => {
    const map = mapRef.current;
    if (!map) return;
    map.fitBounds(
      [[COURSE.bbox[0], COURSE.bbox[1]], [COURSE.bbox[2], COURSE.bbox[3]]],
      { padding: 80, pitch: 40, bearing: 0, duration: 2600, essential: true },
    );
  };

  // Visão geral inicial (rota inteira enquadrada, leve inclinação)
  const showOverview = () => {
    const map = mapRef.current;
    if (!map) return;
    map.fitBounds(
      [[COURSE.bbox[0], COURSE.bbox[1]], [COURSE.bbox[2], COURSE.bbox[3]]],
      { padding: 70, pitch: 40, bearing: 0, duration: 0 },
    );
  };

  return { ready: ready && !error, flyToStart, setProgress, zoomOutFinish, showOverview };
}
