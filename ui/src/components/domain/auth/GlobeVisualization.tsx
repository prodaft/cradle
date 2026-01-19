import { useTheme } from '@/contexts/ui/ThemeContext';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import * as satellite from 'satellite.js';
import { createNoise3D } from 'simplex-noise';

const EARTH_RADIUS_KM = 6371; // km
const TIME_STEP = 3 * 1000; // simulated time step
const POLYGON_TIME_STEP = 200; // smoother polygon animation step
const TICK_MS = 200; // throttle updates to reduce re-renders
const POLYGON_TICK_MS = 100; // smoother cadence for hex polygon recolors

interface GlobeVisualizationProps {
    showArcs?: boolean;
    showSatellites?: boolean;
    showHexPolygons?: boolean;
    showAtmosphere?: boolean;
    autoRotate?: boolean;
    autoRotateSpeed?: number;
}

interface SatelliteData {
    satrec: satellite.SatRec;
    name: string;
    lat?: number;
    lng?: number;
    alt?: number;
}

// Create simplex noise generator
const noise3D = createNoise3D();

// Fractal Brownian Motion using simplex noise
const fbm = (x: number, y: number, z: number, octaves: number = 4, lacunarity: number = 2.0, gain: number = 0.5) => {
    let amplitude = 1.0;
    let frequency = 1.0;
    let result = 0.0;
    let maxValue = 0.0;

    for (let i = 0; i < octaves; i++) {
        result += noise3D(x * frequency, y * frequency, z * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= gain;
        frequency *= lacunarity;
    }

    return result / maxValue;
};

// Smoothstep for better contrast
const smoothstep = (edge0: number, edge1: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
};

const centroidFromRing = (ring: number[][]) => {
    const len = ring.length;
    if (len < 3) return null;

    const first = ring[0];
    const last = ring[len - 1];
    const isClosed = first[0] === last[0] && first[1] === last[1];
    const count = isClosed ? len - 1 : len;
    if (count < 3) return null;

    let areaTimes2 = 0;
    let cxTimes6 = 0;
    let cyTimes6 = 0;
    for (let i = 0; i < count; i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[(i + 1) % count];
        const cross = xi * yj - xj * yi;
        areaTimes2 += cross;
        cxTimes6 += (xi + xj) * cross;
        cyTimes6 += (yi + yj) * cross;
    }

    if (areaTimes2 === 0) {
        let sumX = 0;
        let sumY = 0;
        for (let i = 0; i < count; i++) {
            sumX += ring[i][0];
            sumY += ring[i][1];
        }
        return { lng: sumX / count, lat: sumY / count, area: 0 };
    }

    const area = areaTimes2 / 2;
    return {
        lng: cxTimes6 / (3 * areaTimes2),
        lat: cyTimes6 / (3 * areaTimes2),
        area,
    };
};

const computeGeometryCentroid = (geometry: any) => {
    if (!geometry) return null;

    if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
        const ring = geometry.coordinates[0];
        if (!Array.isArray(ring)) return null;
        const centroid = centroidFromRing(ring);
        if (!centroid) return null;
        return { lng: centroid.lng, lat: centroid.lat };
    }

    if (geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) {
        let sumLng = 0;
        let sumLat = 0;
        let totalArea = 0;
        for (const polygon of geometry.coordinates) {
            const ring = polygon?.[0];
            if (!Array.isArray(ring)) continue;
            const centroid = centroidFromRing(ring);
            if (!centroid) continue;
            const weight = Math.abs(centroid.area);
            if (weight === 0) continue;
            sumLng += centroid.lng * weight;
            sumLat += centroid.lat * weight;
            totalArea += weight;
        }
        if (totalArea === 0) return null;
        return { lng: sumLng / totalArea, lat: sumLat / totalArea };
    }

    return null;
};

export default function GlobeVisualization({
    showArcs = false,
    showSatellites = false,
    showHexPolygons = false,
    showAtmosphere = true,
    autoRotate = true,
    autoRotateSpeed = 0.5,
}: GlobeVisualizationProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const globeRef = useRef<any>(undefined);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const { isDarkMode } = useTheme();

    // Satellite state
    const [satData, setSatData] = useState<SatelliteData[]>([]);
    const [time, setTime] = useState(new Date());
    const polygonTimeRef = useRef(new Date());
    const [polygonTick, setPolygonTick] = useState(0);

    // Countries data for hex polygons
    const [countries, setCountries] = useState<{ features: any[] }>({ features: [] });

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight,
                });
            }
        };

        window.addEventListener('resize', updateDimensions);
        updateDimensions();

        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    useEffect(() => {
        if (globeRef.current) {
            globeRef.current.controls().autoRotate = autoRotate;
            globeRef.current.controls().autoRotateSpeed = autoRotateSpeed;
            globeRef.current.controls().enableZoom = false;
            globeRef.current.pointOfView({ altitude: 1.8 });
        }
    }, [dimensions, autoRotate, autoRotateSpeed]);

    // Fetch and parse TLE data
    useEffect(() => {
        fetch('/datasets/sat_data.txt')
            .then(r => {
                return r.text();
            })
            .then(rawData => {
                const tleData = rawData.replace(/\r/g, '')
                    .split(/\n(?=[^12])/)
                    .filter(d => d)
                    .map(tle => tle.split('\n'));

                const parsedSatData = tleData
                    .map(([name, ...tle]) => ({
                        satrec: satellite.twoline2satrec(...(tle as [string, string])),
                        name: name.trim().replace(/^0 /, ''),
                    }))
                    .filter(
                        (d) =>
                            !!satellite.propagate(d.satrec, new Date())?.position,
                    );

                setSatData(parsedSatData);
            })
            .catch(error => {
                console.error('[GlobeVisualization] Failed to fetch TLE data:', error);
            });
    }, []);

    // Fetch countries GeoJSON data
    useEffect(() => {
        fetch('/datasets/ne_110m_admin_0_countries.geojson')
            .then(res => res.json())
            .then(data => {
                const features = (data?.features ?? []).map((feature: any) => {
                    const centroid = computeGeometryCentroid(feature.geometry);
                    if (!centroid) return feature;
                    return {
                        ...feature,
                        properties: {
                            ...feature.properties,
                            __centroid: centroid,
                        },
                    };
                });
                setCountries({ ...data, features });
            })
            .catch(error => {
                console.error('[GlobeVisualization] Failed to fetch countries data:', error);
            });
    }, []);

    // Time ticker - runs when satellites are enabled
    useEffect(() => {
        if (!showSatellites) return;
        if (satData.length === 0) return;

        const intervalId = window.setInterval(() => {
            setTime(prevTime => new Date(prevTime.getTime() + TIME_STEP));
        }, TICK_MS);

        return () => {
            clearInterval(intervalId);
        };
    }, [showSatellites, satData.length]);

    useEffect(() => {
        if (!showHexPolygons) return;

        const intervalId = window.setInterval(() => {
            polygonTimeRef.current = new Date(polygonTimeRef.current.getTime() + POLYGON_TIME_STEP);
            setPolygonTick(tick => (tick + 1) % 1000000);
        }, POLYGON_TICK_MS);

        return () => {
            clearInterval(intervalId);
        };
    }, [showHexPolygons]);

    // Update satellite positions for particles layer
    const particlesData = useMemo(() => {
        if (!showSatellites || satData.length === 0) return [];

        // Update satellite positions
        const gmst = satellite.gstime(time);
        const updatedSats = satData.map(d => {
            const eci = satellite.propagate(d.satrec, time);
            if (eci?.position && typeof eci.position !== 'boolean') {
                const gdPos = satellite.eciToGeodetic(eci.position, gmst);
                const lat = satellite.radiansToDegrees(gdPos.latitude);
                const lng = satellite.radiansToDegrees(gdPos.longitude);
                const alt = gdPos.height / EARTH_RADIUS_KM;
                return { ...d, lat, lng, alt };
            } else {
                return { ...d, lat: NaN, lng: NaN, alt: NaN };
            }
        }).filter(d => !isNaN(d.lat!) && !isNaN(d.lng!) && !isNaN(d.alt!));

        return updatedSats;
    }, [satData, time, showSatellites]);

    const N = 20;
    const arcsData = useMemo(() => {
        if (!showArcs) return [];

        return [...Array(N).keys()].map(() => ({
            startLat: (Math.random() - 0.5) * 180,
            startLng: (Math.random() - 0.5) * 360,
            endLat: (Math.random() - 0.5) * 180,
            endLng: (Math.random() - 0.5) * 360,
            color: isDarkMode
                ? ['#ffffff', '#cccccc', '#999999', '#666666'][
                Math.floor(Math.random() * 4)
                ]
                : ['#111111', '#333333', '#555555', '#777777'][
                Math.floor(Math.random() * 4)
                ],
            dashLength: Math.random(),
            dashGap: Math.random(),
            animateTime: Math.random() * 4000 + 500,
        }));
    }, [showArcs, isDarkMode]);

    const globeImageUrl = '//unpkg.com/three-globe/example/img/earth-night.jpg';
    const bumpImageUrl = '//unpkg.com/three-globe/example/img/earth-topology.png';
    const backgroundCol = 'rgba(0,0,0,0)';

    const particlesColor = useCallback(() => 'palegreen', []);

    // Hex polygons data - only show when enabled
    const hexPolygonsData = useMemo(() => {
        if (!showHexPolygons) return [];
        return countries.features;
    }, [showHexPolygons, countries.features]);

    // Breathing effect color function - dramatic localized breathing patches
    const hexPolygonColor = useCallback((feature: any) => {
        if (!showHexPolygons) return 'rgba(0,0,0,0)';

        const centroidLng = feature.properties?.__centroid?.lng
            ?? feature.properties?.LABEL_X
            ?? 0;
        const centroidLat = feature.properties?.__centroid?.lat
            ?? feature.properties?.LABEL_Y
            ?? 0;

        // Convert lat/lng to 3D sphere coordinates (unit sphere)
        const latRad = (centroidLat * Math.PI) / 180;
        const lngRad = (centroidLng * Math.PI) / 180;
        const px = Math.cos(latRad) * Math.cos(lngRad);
        const py = Math.sin(latRad);
        const pz = Math.cos(latRad) * Math.sin(lngRad);

        // Time evolution - tuned for visible but smooth animation
        const t = polygonTimeRef.current.getTime() / 8000;

        // Base spatial frequency - larger patches
        const scale = 1.8;

        // Primary noise layer - regional breathing patches
        const noise1 = fbm(
            (px + t * 0.12) * scale,
            (py + t * 0.09) * scale,
            (pz + t * 0.07) * scale,
            4, // octaves
            2.0, // lacunarity
            0.5 // gain
        );

        // Secondary detail layer - adds texture
        const noise2 = fbm(
            (px - t * 0.08) * scale * 2.3,
            (py - t * 0.06) * scale * 2.3,
            (pz - t * 0.05) * scale * 2.3,
            3, // fewer octaves for smoother detail
            2.0,
            0.6
        );

        // Combine: dominant regional + subtle detail
        const combined = noise1 * 0.75 + noise2 * 0.25;

        // Map noise from [-1, 1] to [0, 1]
        const normalized = (combined + 1) * 0.5;

        // Apply strong smoothstep for distinct bright/dark regions
        const shaped = smoothstep(0.2, 0.6, normalized);

        // Wide brightness range for dramatic effect
        const brightness = 0.2 + shaped * 0.95;

        // Cyan/blue color with high contrast
        const r = Math.floor(brightness * 25);
        const g = Math.floor(brightness * 170);
        const b = Math.floor(brightness * 255);

        return `rgba(${r}, ${g}, ${b}, 0.85)`;
    }, [showHexPolygons, polygonTick]);

    return (
        <div
            ref={containerRef}
            className='absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden bg-transparent grayscale opacity-50 dark:opacity-100'
        >
            {dimensions.width > 0 && (
                <Globe
                    ref={globeRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    globeImageUrl={globeImageUrl}
                    bumpImageUrl={bumpImageUrl}
                    backgroundColor={backgroundCol}
                    arcsData={arcsData}
                    arcColor='color'
                    arcDashLength="dashLength"
                    arcDashGap="dashGap"
                    arcDashAnimateTime="animateTime"
                    atmosphereColor={showAtmosphere ? (isDarkMode ? '#ffffff' : '#333333') : undefined}
                    atmosphereAltitude={showAtmosphere ? 0.15 : 0}
                    // Particles configuration matching React example
                    particlesData={particlesData}
                    particleLabel='name'
                    particleLat='lat'
                    particleLng='lng'
                    particleAltitude='alt'
                    particlesColor={particlesColor}
                    // Hex polygons with breathing effect
                    hexPolygonsData={hexPolygonsData}
                    hexPolygonResolution={3}
                    hexPolygonMargin={0.3}
                    hexPolygonUseDots={true}
                    hexPolygonColor={hexPolygonColor}
                />
            )}
        </div>
    );
}
