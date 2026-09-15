import * as THREE from 'three';
import mapboxgl, { type CustomLayerInterface } from 'mapbox-gl';
import { createDecoration, type ObjectPreviewProps } from './ObjectPreview';

export type SceneDecoration = { id: string; coordinates: [number, number]; name: string; color: string; size: ObjectPreviewProps['size'] };

/** A display-sized decoration; the underlying building geometry is never changed. */
export function decorationsLayer(items: SceneDecoration[]): CustomLayerInterface {
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const models = items.map(item => {
    const group = new THREE.Group(), mesh = createDecoration(item.color, item.size);
    group.matrixAutoUpdate = false; group.add(mesh); scene.add(group);
    return { item, group, mesh };
  });
  scene.add(new THREE.AmbientLight(0xffffff, 2.4));
  const sunlight = new THREE.DirectionalLight(0xffffff, 3); sunlight.position.set(-1, -2, 3); scene.add(sunlight);
  let renderer: THREE.WebGLRenderer | undefined;
  let map: mapboxgl.Map;
  const rotation = new THREE.Matrix4().makeRotationX(Math.PI / 2);
  return {
    id: 'sodateru-decorations', type: 'custom', renderingMode: '3d', slot: 'top',
    onAdd(value, gl) {
      map = value;
      renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
      renderer.autoClear = false;
    },
    render(_gl, matrix) {
      if (!renderer) return;
      const zoom = map.getZoom();
      for (const { item, group } of models) {
        const altitude = map.queryTerrainElevation(item.coordinates) ?? 0;
        const position = mapboxgl.MercatorCoordinate.fromLngLat(item.coordinates, altitude);
        const metersPerPixel = 40075016.686 * Math.cos(item.coordinates[1] * Math.PI / 180) / (512 * 2 ** zoom);
        const scale = position.meterInMercatorCoordinateUnits() * metersPerPixel * 27;
        group.matrix.makeTranslation(position.x, position.y, position.z).multiply(new THREE.Matrix4().makeScale(scale, -scale, scale)).multiply(rotation);
      }
      camera.projectionMatrix.fromArray(matrix);
      renderer.resetState(); renderer.render(scene, camera);
    },
    onRemove() { for (const { mesh } of models) { mesh.geometry.dispose(); mesh.material.dispose(); } renderer?.dispose(); },
  };
}
