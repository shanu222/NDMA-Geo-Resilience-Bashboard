import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Basemap = 'osm' | 'satellite' | 'terrain';

export type MapPoint = { id: string; lat: number; lng: number; label?: string; meta?: string };

function BasemapLayer({ basemap }: { basemap: Basemap }) {
  if (basemap === 'satellite') {
    return (
      <TileLayer
        attribution="Tiles &copy; Esri"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />
    );
  }
  if (basemap === 'terrain') {
    return (
      <TileLayer
        attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
      />
    );
  }
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
  );
}

function RoadsOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <TileLayer
      attribution='&copy; OpenStreetMap'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      opacity={0.55}
    />
  );
}

function HeatOverlay({
  points,
}: {
  points: { lat: number; lng: number; v: number }[];
}) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await import('leaflet.heat');
      if (cancelled) return;
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      if (!points.length) return;
      const heat = (L as unknown as { heatLayer: (p: [number, number, number][], o: object) => L.Layer }).heatLayer(
        points.map((p) => [p.lat, p.lng, Math.min(1, p.v / 80)] as [number, number, number]),
        { radius: 28, blur: 18, maxZoom: 12 },
      );
      heat.addTo(map);
      layerRef.current = heat;
    })();
    return () => {
      cancelled = true;
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, points]);

  return null;
}

function FitPakistan({ trigger }: { trigger: number }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(
      [
        [23.5, 60.5],
        [37.2, 77.5],
      ],
      { padding: [24, 24] },
    );
  }, [map]);
  useEffect(() => {
    if (!trigger) return;
    map.fitBounds(
      [
        [23.5, 60.5],
        [37.2, 77.5],
      ],
      { padding: [24, 24] },
    );
  }, [map, trigger]);
  return null;
}

export default function PakistanMapView({
  basemap,
  activeLayers,
  infrastructure,
  disasters,
  weatherHeat,
  locations,
  fitSignal,
}: {
  basemap: Basemap;
  activeLayers: string[];
  infrastructure: MapPoint[];
  disasters: MapPoint[];
  weatherHeat: { lat: number; lng: number; v: number }[];
  locations: MapPoint[];
  fitSignal: number;
}) {
  const center: [number, number] = [30.3753, 69.3451];
  const showWeather = activeLayers.includes('weather');
  const showHistory = activeLayers.includes('history');
  const showInfra = activeLayers.includes('infrastructure');
  const showPop = activeLayers.includes('population');

  const heatPts = useMemo(() => (showWeather ? weatherHeat : []), [showWeather, weatherHeat]);

  return (
    <MapContainer
      center={center}
      zoom={6}
      className="size-full z-0"
      style={{ minHeight: '100%', background: '#0a1f35' }}
      preferCanvas
    >
      <BasemapLayer basemap={basemap} />
      <RoadsOverlay show={basemap === 'satellite' || basemap === 'terrain'} />
      <HeatOverlay points={heatPts} />

      <FitPakistan trigger={fitSignal} />

      <LayerGroup>
        {showPop &&
          locations.map((p) => (
            <CircleMarker
              key={`pop-${p.id}`}
              center={[p.lat, p.lng]}
              radius={Math.min(28, 8 + (p.meta ? Number(p.meta) / 200000 : 6))}
              pathOptions={{ color: '#8B5CF6', fillColor: '#8B5CF6', fillOpacity: 0.2 }}
            >
              <Popup>{p.label}</Popup>
            </CircleMarker>
          ))}

        {showInfra &&
          infrastructure.map((p) => (
            <CircleMarker
              key={`inf-${p.id}`}
              center={[p.lat, p.lng]}
              radius={6}
              pathOptions={{ color: '#22C55E', fillColor: '#22C55E', fillOpacity: 0.85 }}
            >
              <Popup>
                {p.label}
                {p.meta ? <div className="text-xs opacity-80">{p.meta}</div> : null}
              </Popup>
            </CircleMarker>
          ))}

        {showHistory &&
          disasters.map((p) => (
            <CircleMarker
              key={`dis-${p.id}`}
              center={[p.lat, p.lng]}
              radius={7}
              pathOptions={{ color: '#FF7A00', fillColor: '#FF7A00', fillOpacity: 0.75 }}
            >
              <Popup>{p.label}</Popup>
            </CircleMarker>
          ))}
      </LayerGroup>
    </MapContainer>
  );
}
