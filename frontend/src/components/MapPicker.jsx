import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet default ikon sorunu düzeltmesi
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function LocationPicker({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPicker({ lat, lng, onSelect }) {
  const defaultCenter = [41.0082, 28.9784]; // İstanbul

  return (
    <div className="rounded-xl overflow-hidden border border-zinc-600">
      <p className="text-xs text-zinc-400 px-3 py-2 bg-zinc-800/80">
        📍 Haritaya tıklayarak hedef konumu seç
      </p>
      <MapContainer
        center={lat ? [lat, lng] : defaultCenter}
        zoom={13}
        style={{ height: '200px', width: '100%' }}
        className="sm:!h-[280px]"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <LocationPicker onSelect={onSelect} />
        {lat && <Marker position={[lat, lng]} />}
      </MapContainer>
      {lat && (
        <p className="text-xs text-emerald-400 px-3 py-2 bg-emerald-500/10">
          ✅ Konum seçildi: {lat.toFixed(4)}, {lng.toFixed(4)}
        </p>
      )}
    </div>
  );
}