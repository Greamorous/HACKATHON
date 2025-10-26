import { useState, useRef, useEffect } from 'react';
import './App.css';
import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import axios from 'axios';

type Satellite = {
  id: number;
  name: string;
  altitude: number;
  inclination: number;
};

type Alert = {
  id: number;
  satelliteId: number;
  message: string;
  action: string;
  executed: boolean;
};

function App() {
  const [satellites, setSatellites] = useState<Satellite[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [executedActions, setExecutedActions] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [altitude, setAltitude] = useState('');
  const [inclination, setInclination] = useState('');
  const mountRef = useRef<HTMLDivElement>(null);

  const fetchCMEAlerts = async (): Promise<string[]> => {
    try {
      const response = await axios.get('https://services.swpc.noaa.gov/json/alerts.json');
      const alerts = response.data;
      const cmeAlerts = alerts
        .filter((alert: any) => alert.message.includes('Coronal Mass Ejection'))
        .map((alert: any) => alert.message);
      return cmeAlerts;
    } catch (error) {
      console.error('Error fetching CME alerts:', error);
      return [];
    }
  };

  const simulateConjunctionAlert = (satelliteId: number): Alert | null => {
    const chance = Math.random();
    if (chance < 0.4) return null;

    return {
      id: Date.now() + Math.floor(Math.random() * 1000),
      satelliteId,
      message: 'Conjunction alert: Possible collision with space debris!',
      action: 'Perform evasive maneuver or adjust orbit',
      executed: false,
    };
  };

  const addSatellite = async () => {
    if (!name || !altitude || !inclination) return;

    const newSat: Satellite = {
      id: Date.now(),
      name,
      altitude: parseFloat(altitude),
      inclination: parseFloat(inclination),
    };

    setSatellites((prev) => [...prev, newSat]);
    setName('');
    setAltitude('');
    setInclination('');

    // Wait 10 seconds before generating threats
    setTimeout(async () => {
      const cmeMessages = await fetchCMEAlerts();
      if (cmeMessages.length > 0) {
        const alert: Alert = {
          id: Date.now(),
          satelliteId: newSat.id,
          message: cmeMessages[0],
          action: 'Switch off non-critical electronics and shield instruments',
          executed: false,
        };
        setAlerts((prev) => [...prev, alert]);
      }

      const conjunctionAlert = simulateConjunctionAlert(newSat.id);
      if (conjunctionAlert) {
        setAlerts((prev) => [...prev, conjunctionAlert]);
      }
    }, 10000);
  };

  const executeAction = (alert: Alert) => {
    if (alert.executed) return;

    const satName = satellites.find((s) => s.id === alert.satelliteId)?.name || 'Unknown Satellite';
    const log = `✅ Action executed for ${satName}: ${alert.action}`;
    setExecutedActions((prev) => [...prev, log]);

    // Mark alert as executed and remove it
    setAlerts((prev) =>
      prev.map((a) => (a.id === alert.id ? { ...a, executed: true } : a)).filter((a) => a.id !== alert.id)
    );
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;

    const earthGeometry = new THREE.SphereGeometry(1, 32, 32);
    const earthMaterial = new THREE.MeshBasicMaterial({ color: 0x0033aa, wireframe: true });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);

    satellites.forEach((sat, index) => {
      const hasAlert = alerts.some((alert) => alert.satelliteId === sat.id);

      const satGeometry = new THREE.SphereGeometry(hasAlert ? 0.08 : 0.05, 16, 16);
      const satMaterial = new THREE.MeshBasicMaterial({
        color: hasAlert ? 0xff0000 : 0xffaa00,
      });

      const satMesh = new THREE.Mesh(satGeometry, satMaterial);

      const radius = 1 + sat.altitude / 10000;
      const angle = (index / satellites.length) * Math.PI * 2;
      satMesh.position.set(
        radius * Math.cos(angle),
        radius * Math.sin(angle),
        radius * Math.sin(sat.inclination * (Math.PI / 180))
      );

      scene.add(satMesh);
    });

    camera.position.z = 5;

    const animate = () => {
      requestAnimationFrame(animate);
      earth.rotation.y += 0.001;
      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [satellites, alerts]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#111', color: '#fff' }}>
      <div style={{ width: '35%', padding: '20px', overflowY: 'auto' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '20px' }}>🛰️ Satellite Dashboard</h1>

        <h2>Add New Satellite</h2>
        <input
          type="text"
          placeholder="Satellite Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ display: 'block', marginBottom: '10px', width: '90%', padding: '8px' }}
        />
        <input
          type="number"
          placeholder="Altitude (km)"
          value={altitude}
          onChange={(e) => setAltitude(e.target.value)}
          style={{ display: 'block', marginBottom: '10px', width: '90%', padding: '8px' }}
        />
        <input
          type="number"
          placeholder="Inclination (°)"
          value={inclination}
          onChange={(e) => setInclination(e.target.value)}
          style={{ display: 'block', marginBottom: '10px', width: '90%', padding: '8px' }}
        />
        <button
          onClick={addSatellite}
          style={{
            padding: '10px 20px',
            background: '#00aaff',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            borderRadius: '8px',
            marginBottom: '20px',
          }}
        >
          ➕ Add Satellite
        </button>

        <h2>Satellites</h2>
        <ul>
          {satellites.map((sat) => (
            <li key={sat.id}>
              <strong>{sat.name}</strong> — {sat.altitude} km, {sat.inclination}°
            </li>
          ))}
        </ul>

        <h2 style={{ marginTop: '20px' }}>Alerts</h2>
        <ul>
          {alerts.map((alert) => (
            <li key={alert.id} style={{ marginBottom: '10px', color: '#ffcc00' }}>
              ⚠️ <strong>{satellites.find((s) => s.id === alert.satelliteId)?.name}</strong>: {alert.message}
              <br />
              <em style={{ color: '#00ffaa' }}>Suggested action: {alert.action}</em>
              <br />
              {!alert.executed && (
                <button
                  onClick={() => executeAction(alert)}
                  style={{
                    marginTop: '5px',
                    padding: '6px 12px',
                    background: '#00ffaa',
                    border: 'none',
                    color: '#000',
                    cursor: 'pointer',
                    borderRadius: '6px',
                  }}
                >
                  Execute Action
                </button>
              )}
            </li>
          ))}
        </ul>

        <h2 style={{ marginTop: '20px' }}>Executed Actions</h2>
        <ul>
          {executedActions.map((log, index) => (
            <li key={index} style={{ color: '#00ffcc' }}>{log}</li>
          ))}
        </ul>
      </div>

      <div style={{ flex: 1 }}>
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}

export default App;
