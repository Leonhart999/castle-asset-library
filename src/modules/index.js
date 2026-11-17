// Registry of every module in the kit. Each module is { id, name, category, description, build(materials) }
// and build() returns a THREE.Group centred on x = z = 0 with its base at y = 0 (1 unit = 1 m).

import { wallModules } from './wall.js';
import { towerModules } from './tower.js';
import { gateModules } from './gate.js';

export const MODULES = [...wallModules, ...towerModules, ...gateModules];

export function byId(id) {
  return MODULES.find((m) => m.id === id);
}
