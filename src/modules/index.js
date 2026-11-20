// Registry of every module in the kit. Each module is { id, name, category, description, build(materials) }
// and build() returns a THREE.Group centred on x = z = 0 with its base at y = 0 (1 unit = 1 m).

import { wallModules } from './wall.js';
import { towerModules } from './tower.js';
import { gateModules } from './gate.js';
import { defenceWallModules } from './defence_walls.js';
import { defenceTowerModules } from './defence_towers.js';
import { defenceGateMoatModules } from './defence_gate_moat.js';
import { furnitureModules } from './furniture.js';
import { containerModules } from './containers.js';
import { weaponModules } from './weapons.js';
import { bladeModules } from './arms_blades.js';
import { rangedModules } from './arms_ranged.js';
import { shieldRackModules } from './arms_shields.js';
import { armourModules } from './arms_armour.js';
import { siegeEngineModules } from './siege_engines.js';
import { siegeAssaultModules } from './siege_assault.js';
import { siegeDefenceModules } from './siege_defence.js';
import { lightingModules } from './lighting.js';
import { workshopModules } from './workshop.js';
import { kitchenModules } from './kitchen.js';
import { chapelModules, heraldryModules } from './chapel.js';
import { studyModules } from './room_study.js';
import { stableModules } from './room_stable.js';
import { courtyardModules } from './yard.js';
import { dungeonModules } from './dungeon.js';
import { archModules } from './arches.js';
import { windowModules } from './windows.js';
import { stairModules } from './stairs.js';
import { hearthModules } from './hearth.js';
import { roofModules } from './roofs.js';
import { structureModules } from './structure.js';
import { doorModules } from './doors.js';

export const MODULES = [
  ...wallModules,
  ...towerModules,
  ...gateModules,
  ...defenceWallModules,
  ...defenceTowerModules,
  ...defenceGateMoatModules,
  ...archModules,
  ...windowModules,
  ...stairModules,
  ...hearthModules,
  ...roofModules,
  ...structureModules,
  ...doorModules,
  ...furnitureModules,
  ...containerModules,
  ...weaponModules,
  ...bladeModules,
  ...rangedModules,
  ...shieldRackModules,
  ...armourModules,
  ...siegeEngineModules,
  ...siegeAssaultModules,
  ...siegeDefenceModules,
  ...lightingModules,
  ...workshopModules,
  ...kitchenModules,
  ...chapelModules,
  ...heraldryModules,
  ...studyModules,
  ...stableModules,
  ...courtyardModules,
  ...dungeonModules,
];

export function byId(id) {
  return MODULES.find((m) => m.id === id);
}
