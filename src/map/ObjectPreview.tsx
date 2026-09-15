import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './map.css';

export type ObjectPreviewProps = {
  color: string;
  size: 'small' | 'medium' | 'large';
  label?: string;
};

/** The same meter-independent display shape used for a person's decorations. */
export function createDecoration(color: string, size: ObjectPreviewProps['size']) {
  const scale = { small: 0.65, medium: 1, large: 1.4 }[size];
  const geometry = new THREE.BoxGeometry(scale, scale, scale);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = scale / 2;
  return mesh;
}

export function ObjectPreview({ color, size, label = '編集中の目印の3Dプレビュー' }: ObjectPreviewProps) {
  const host = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      setUnavailable(true);
      return;
    }
    setUnavailable(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    element.append(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1.45, 1.45, 1.7, -1.2, 0.1, 20);
    camera.position.set(4, 3.5, 5);
    camera.lookAt(0, 0.55, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 2.4));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(-3, 6, 4);
    scene.add(light);
    const cube = createDecoration(color, size);
    scene.add(cube);
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      renderer.setSize(width, height, false);
      const ratio = width / height;
      camera.left = -1.45 * ratio;
      camera.right = 1.45 * ratio;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    return () => {
      observer.disconnect();
      cube.geometry.dispose();
      cube.material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [color, size]);

  return <div className="map-object-preview" ref={host} role="img" aria-label={label}>
    {unavailable && <span role="status">3Dプレビューを表示できません</span>}
  </div>;
}
