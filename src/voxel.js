// Voxel model builder. A model is a list of axis-aligned boxes in tile units;
// every box of the same colour is merged into ONE BufferGeometry so a model
// costs one draw call per distinct colour rather than one per box. Materials
// are shared across every model, and geometries are cached by name so a
// hundred cars share one set. See SPEC.md §4.

import * as THREE from 'three';

const materials = new Map();
const geometries = new Map();

export function material(color) {
  let m = materials.get(color);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color });
    materials.set(color, m);
  }
  return m;
}

// Merge several translated BoxGeometries into one indexed BufferGeometry.
function mergeBoxes(boxes) {
  const positions = [];
  const normals = [];
  const indices = [];
  let offset = 0;
  const box = new THREE.BoxGeometry(1, 1, 1);
  const bp = box.getAttribute('position').array;
  const bn = box.getAttribute('normal').array;
  const bi = box.getIndex().array;
  for (const b of boxes) {
    for (let i = 0; i < bp.length; i += 3) {
      positions.push(bp[i] * b.w + b.x, bp[i + 1] * b.h + b.y, bp[i + 2] * b.d + b.z);
      normals.push(bn[i], bn[i + 1], bn[i + 2]);
    }
    for (let i = 0; i < bi.length; i++) indices.push(bi[i] + offset);
    offset += bp.length / 3;
  }
  box.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setIndex(indices);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

/**
 * Build a Group of meshes from `boxes` = [{x,y,z,w,h,d,color}].
 * @param {object} opts
 * @param {string} [opts.name]  cache key; identical names share geometry
 * @param {boolean} [opts.castShadow=true]
 * @param {boolean} [opts.receiveShadow=true]
 */
export function buildVoxelMesh(boxes, opts = {}) {
  const { name, castShadow = true, receiveShadow = true } = opts;
  const group = new THREE.Group();

  const byColor = new Map();
  for (const b of boxes) {
    if (!byColor.has(b.color)) byColor.set(b.color, []);
    byColor.get(b.color).push(b);
  }

  for (const [color, list] of byColor) {
    const key = name ? `${name}:${color}` : null;
    let geo = key ? geometries.get(key) : null;
    if (!geo) {
      geo = mergeBoxes(list);
      if (key) geometries.set(key, geo);
    }
    const mesh = new THREE.Mesh(geo, material(color));
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    mesh.userData.color = color;
    group.add(mesh);
  }
  return group;
}

// Convenience for writing model definitions: box(x, y, z, w, h, d, color).
export const box = (x, y, z, w, h, d, color) => ({ x, y, z, w, h, d, color });

export function stats() {
  return { materials: materials.size, geometries: geometries.size };
}
