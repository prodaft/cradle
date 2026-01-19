import { useTheme } from '@/contexts/ui/ThemeContext';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import * as satellite from 'satellite.js';

const EARTH_RADIUS_KM = 6371; // km
const TIME_STEP = 3 * 1000; // simulated time step
const TICK_MS = 200; // throttle updates to reduce re-renders

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

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number) => a + t * (b - a);
const dotGridGradient = (ix: number, iy: number, x: number, y: number) => {
    const random = 2920 * Math.sin(ix * 21942 + iy * 171324 + ix * iy * 23157);
    const gradX = Math.cos(random);
    const gradY = Math.sin(random);
    const dx = x - ix;
    const dy = y - iy;
    return dx * gradX + dy * gradY;
};
const perlin2D = (x: number, y: number) => {
    const x0 = Math.floor(x);
    const x1 = x0 + 1;
    const y0 = Math.floor(y);
    const y1 = y0 + 1;

    const sx = fade(x - x0);
    const sy = fade(y - y0);

    const n0 = dotGridGradient(x0, y0, x, y);
    const n1 = dotGridGradient(x1, y0, x, y);
    const ix0 = lerp(n0, n1, sx);
    const n2 = dotGridGradient(x0, y1, x, y);
    const n3 = dotGridGradient(x1, y1, x, y);
    const ix1 = lerp(n2, n3, sx);

    return lerp(ix0, ix1, sy);
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
                setCountries(data);
            })
            .catch(error => {
                console.error('[GlobeVisualization] Failed to fetch countries data:', error);
            });
    }, []);

    // Time ticker - runs when satellites or hex polygons are enabled
    useEffect(() => {
        if (!showSatellites && !showHexPolygons) return;
        if (showSatellites && satData.length === 0) return;

        const intervalId = window.setInterval(() => {
            setTime(prevTime => new Date(prevTime.getTime() + TIME_STEP));
        }, TICK_MS);

        return () => {
            clearInterval(intervalId);
        };
    }, [showSatellites, showHexPolygons, satData.length]);

    // Update satellite positions and return as array of arrays - matching React example
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

        // CRITICAL: Return array of arrays, not flat array!
        return [updatedSats];
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

    // Breathing effect color function - perlin noise shimmer across globe
    const hexPolygonColor = useCallback((feature: any) => {
        if (!showHexPolygons) return 'rgba(0,0,0,0)';

        const centroidLng = feature.properties?.LABEL_X ?? 0;
        const centroidLat = feature.properties?.LABEL_Y ?? 0;
        const t = time.getTime() / 10000;
        const noise = perlin2D(centroidLng * 0.02 + t * 0.25, centroidLat * 0.02 + t * 0.15);
        const normalized = Math.min(Math.max((noise + 1) / 2, 0), 1);
        const brightness = 0.42 + normalized * 0.22;

        // Create cyan/blue color with breathing effect
        const r = Math.floor(0 * 255);
        const g = Math.floor(brightness * 180);
        const b = Math.floor(brightness * 240);

        return `rgba(${r}, ${g}, ${b}, 0.5)`;
    }, [showHexPolygons, time]);

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
