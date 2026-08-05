export type MapMarker = {
  latitude: number;
  longitude: number;
};

/** Auckland Park, Johannesburg */
const DEFAULT_CENTER = { latitude: -26.1886, longitude: 28.0067 };
const DEFAULT_ZOOM = 15;

const DEFAULT_MARKERS: MapMarker[] = [
  { latitude: -26.1886, longitude: 28.0067 },
  { latitude: -26.1868, longitude: 28.0092 },
  { latitude: -26.1904, longitude: 28.0041 },
];

/** Leaflet + OpenStreetMap tiles (free, no API key). */
export function buildCommunityMapHtml(
  markers: MapMarker[] = DEFAULT_MARKERS,
  center: MapMarker = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
) {
  const markersJson = JSON.stringify(markers);
  const centerJson = JSON.stringify([center.latitude, center.longitude]);

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
    <style>
      html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #e2e8f0; }
      .leaflet-control-attribution { font-size: 9px; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const center = ${centerJson};
      const markers = ${markersJson};
      const map = L.map("map", {
        zoomControl: false,
        attributionControl: true,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false,
      }).setView(center, ${zoom});

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      markers.forEach(function (m) {
        L.circleMarker([m.latitude, m.longitude], {
          radius: 7,
          color: "#1e3a8a",
          fillColor: "#1e3a8a",
          fillOpacity: 0.9,
          weight: 2,
        }).addTo(map);
      });

      setTimeout(function () { map.invalidateSize(); }, 100);
    </script>
  </body>
</html>`;
}
