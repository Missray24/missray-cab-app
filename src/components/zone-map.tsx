
'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, DrawingManager, Polygon } from '@react-google-maps/api';

const mapContainerStyle = {
  height: '400px',
  width: '100%',
  borderRadius: '0.5rem',
};

const center = {
  lat: 48.8566, // Paris
  lng: 2.3522,
};

interface ZoneMapProps {
  polygonPath: { lat: number; lng: number }[];
  onPolygonComplete: (path: { lat: number; lng: number }[]) => void;
  isLoaded: boolean;
}

export function ZoneMap({ polygonPath, onPolygonComplete, isLoaded }: ZoneMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);

  const drawingManagerOptions: google.maps.drawing.DrawingManagerOptions | null = isLoaded ? {
    drawingControl: true,
    drawingControlOptions: {
      position: google.maps.ControlPosition.TOP_CENTER,
      drawingModes: [google.maps.drawing.OverlayType.POLYGON],
    },
    polygonOptions: {
      fillColor: '#4A90E2',
      fillOpacity: 0.3,
      strokeWeight: 2,
      strokeColor: '#4A90E2',
      clickable: true,
      editable: true,
      zIndex: 1,
    },
  } : null;

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onDrawingManagerLoad = useCallback((drawingManager: google.maps.drawing.DrawingManager) => {
      // You can add logic here if needed, for instance, to hide the drawing tool after one polygon is drawn.
  }, []);

  const handlePolygonComplete = (polygon: google.maps.Polygon) => {
    const path = polygon
      .getPath()
      .getArray()
      .map(p => ({ lat: p.lat(), lng: p.lng() }));
    onPolygonComplete(path);
    polygon.setMap(null); // Remove the drawn polygon, the parent state will re-render it
  };
  
  const onPolygonLoad = useCallback((polygon: google.maps.Polygon) => {
    polygonRef.current = polygon;
  }, []);

  // Update polygon paths if they change externally
  useEffect(() => {
    if (polygonRef.current) {
        const newPath = new google.maps.MVCArray(polygonPath.map(p => new google.maps.LatLng(p.lat, p.lng)));
        polygonRef.current.setPath(newPath);
    }
  }, [polygonPath]);

  // Adjust map bounds to fit the polygon
  useEffect(() => {
    if (map && polygonPath && polygonPath.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      polygonPath.forEach(point => bounds.extend(new google.maps.LatLng(point.lat, point.lng)));
      map.fitBounds(bounds);
    }
  }, [map, polygonPath]);


  if (!isLoaded) return <div>Loading Map...</div>;

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={10}
      onLoad={onMapLoad}
    >
      {drawingManagerOptions && <DrawingManager
        onLoad={onDrawingManagerLoad}
        onPolygonComplete={handlePolygonComplete}
        options={drawingManagerOptions}
      />}
      {polygonPath && polygonPath.length > 0 && (
         <Polygon
            paths={polygonPath}
            onLoad={onPolygonLoad}
            options={{
                fillColor: '#4A90E2',
                fillOpacity: 0.3,
                strokeWeight: 2,
                strokeColor: '#4A90E2',
                clickable: true,
                editable: false, // Set to false, drawing manager is for creation.
                zIndex: 1,
            }}
        />
      )}
    </GoogleMap>
  );
}
