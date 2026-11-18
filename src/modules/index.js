// Registry of every module in the kit. Each module is { id, name, category, description, build(materials) }
// and build() returns a THREE.Group centred on x = z = 0 with its base at y = 0 (1 unit = 1 m).

import { wallModules } from './wall.js';
import { towerModules } from './tower.js';
import { gateModules } from './gate.js';
import { furnitureModules } from './furniture.js';
import { containerModules } from './containers.js';
import { weaponModules } from './weapons.js';
import { lightingModules } from './lighting.js';

export const MODULES = [
  ...wallModules,
  ...towerModules,
  ...gateModules,
  ...furnitureModules,
  ...containerModules,
  ...weaponModules,
  ...lightingModules,
];

export function byId(id) {
  return MODULES.find((m) => m.id === id);
}
