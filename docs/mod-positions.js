/**
 * Nova Drift Mod Position Reference Data
 * Maps mod names to their hexagonal grid positions
 */

(function(global) {
  'use strict';

  /**
   * Reference mod positions based on Nova Drift's mod tree layout
   * These coordinates are for the baseline 1920x1080 resolution at 100% UI scale
   * 
   * The grid uses axial coordinates (q, r) where:
   * - q increases going right (pointy-top hex orientation)
   * - r increases going down-right
   * - Center is at (0, 0)
   */
  const MOD_POSITIONS = {
    // Starting mods (closest to center)
    "DefaultWeapon": { q: 0, r: 0, category: "weapon", priority: 1 },
    "DefaultShield": { q: 1, r: 0, category: "shield", priority: 1 },
    "DefaultBody": { q: -1, r: 0, category: "body", priority: 1 },

    // First ring - core modifications
    "Split": { q: 0, r: -1, category: "weapon", priority: 2 },
    "Amp": { q: 1, r: -1, category: "weapon", priority: 2 },
    "Pulse": { q: 2, r: -1, category: "weapon", priority: 2 },
    "Barrier": { q: 2, r: 0, category: "shield", priority: 2 },
    "Assault": { q: 1, r: 1, category: "body", priority: 2 },
    "Velocity": { q: 0, r: 1, category: "body", priority: 2 },
    "Agility": { q: -1, r: 1, category: "body", priority: 2 },
    "Cover": { q: -2, r: 1, category: "shield", priority: 2 },
    "Evasion": { q: -2, r: 0, category: "body", priority: 2 },
    "Research": { q: -1, r: -1, category: "special", priority: 2 },

    // Second ring - specialized mods
    "Railgun": { q: 0, r: -2, category: "weapon", priority: 3 },
    "Lance": { q: 1, r: -2, category: "weapon", priority: 3 },
    "Torrent": { q: 2, r: -2, category: "weapon", priority: 3 },
    "Salvo": { q: 3, r: -2, category: "weapon", priority: 3 },
    "Mines": { q: 3, r: -1, category: "weapon", priority: 3 },
    "Grenade": { q: 3, r: 0, category: "weapon", priority: 3 },
    "Turret": { q: 3, r: 1, category: "weapon", priority: 3 },
    "Drones": { q: 2, r: 1, category: "special", priority: 3 },
    "Ally": { q: 2, r: 2, category: "special", priority: 3 },
    "Engineer": { q: 1, r: 2, category: "body", priority: 3 },
    "Juggernaut": { q: 0, r: 2, category: "body", priority: 3 },
    "Stealth": { q: -1, r: 2, category: "body", priority: 3 },
    "Ranger": { q: -2, r: 2, category: "body", priority: 3 },
    "Guardian": { q: -3, r: 2, category: "shield", priority: 3 },
    "Aegis": { q: -3, r: 1, category: "shield", priority: 3 },
    "Bastion": { q: -3, r: 0, category: "shield", priority: 3 },
    "Reflect": { q: -3, r: -1, category: "shield", priority: 3 },
    "Architect": { q: -2, r: -1, category: "special", priority: 3 },
    "Evolution": { q: -2, r: -2, category: "special", priority: 3 },
    "Mastery": { q: -1, r: -2, category: "special", priority: 3 },

    // Third ring - advanced mods
    "ThermalLance": { q: 0, r: -3, category: "weapon", priority: 4 },
    "Snipe": { q: 1, r: -3, category: "weapon", priority: 4 },
    "Breach": { q: 2, r: -3, category: "weapon", priority: 4 },
    "Vortex": { q: 3, r: -3, category: "weapon", priority: 4 },
    "Discharge": { q: 4, r: -3, category: "weapon", priority: 4 },
    "Streamline": { q: 4, r: -2, category: "weapon", priority: 4 },
    "Overpower": { q: 4, r: -1, category: "weapon", priority: 4 },
    "Barrage": { q: 4, r: 0, category: "weapon", priority: 4 },
    "Fusillade": { q: 4, r: 1, category: "weapon", priority: 4 },
    "Sentinel": { q: 4, r: 2, category: "special", priority: 4 },
    "Service": { q: 3, r: 2, category: "special", priority: 4 },
    "Leviathan": { q: 3, r: 3, category: "body", priority: 4 },
    "WarMachine": { q: 2, r: 3, category: "body", priority: 4 },
    "Masochism": { q: 1, r: 3, category: "body", priority: 4 },
    "LastStand": { q: 0, r: 3, category: "body", priority: 4 },
    "Defiance": { q: -1, r: 3, category: "body", priority: 4 },
    "LeafOnTheWind": { q: -2, r: 3, category: "body", priority: 4 },
    "Courser": { q: -3, r: 3, category: "body", priority: 4 },
    "Challenger": { q: -4, r: 3, category: "shield", priority: 4 },
    "Sanctuary": { q: -4, r: 2, category: "shield", priority: 4 },
    "CoreShielding": { q: -4, r: 1, category: "shield", priority: 4 },
    "ForceArmor": { q: -4, r: 0, category: "shield", priority: 4 },
    "Absorption": { q: -4, r: -1, category: "shield", priority: 4 },
    "Rebuke": { q: -4, r: -2, category: "shield", priority: 4 },
    "Revelation": { q: -3, r: -2, category: "special", priority: 4 },
    "Apotheosis": { q: -3, r: -3, category: "special", priority: 4 },
    "Grandeur": { q: -2, r: -3, category: "special", priority: 4 },
    "Subsumption": { q: -1, r: -3, category: "special", priority: 4 },

    // Advanced weapon modifications
    "HeavyCaliber": { q: 5, r: -3, category: "weapon", priority: 4 },
    "HeatSeeking": { q: 0, r: -5, category: "weapon", priority: 4 },
    "Magnitude": { q: -5, r: 3, category: "weapon", priority: 4 },
    "PropulsiveMunitions": { q: 5, r: 0, category: "weapon", priority: 4 },
    "SaturationFire": { q: 5, r: 2, category: "weapon", priority: 4 },

    // Advanced shield modifications  
    "OmniShield": { q: 5, r: -5, category: "shield", priority: 4 },
    "RadiantShields": { q: -5, r: 5, category: "shield", priority: 4 },
    "VolatileShields": { q: 5, r: 5, category: "shield", priority: 4 },
    "WeaponizedShields": { q: -5, r: 0, category: "shield", priority: 4 },

    // Advanced body modifications
    "Hypermetabolism": { q: 0, r: 5, category: "body", priority: 4 },
    "Outmaneuver": { q: -5, r: -5, category: "body", priority: 4 },
    "PowerReserves": { q: 5, r: -2, category: "body", priority: 4 },

    // Special abilities and systems (advanced)
    "Displacement": { q: 1, r: -5, category: "special", priority: 4 },
    "PolarInversion": { q: -1, r: 5, category: "special", priority: 4 },
    "Slipstream": { q: 5, r: -1, category: "special", priority: 4 },

    // Super weapons and end-game mods (using unique positions)
    "Annihilation": { q: 0, r: -4, category: "super", priority: 5 },
    "DyingStar": { q: 2, r: -4, category: "super", priority: 5 },
    "Transmogrification": { q: 4, r: -4, category: "super", priority: 5 },
    "Ataraxia": { q: 6, r: -1, category: "super", priority: 5 },
    "TerminalDirective": { q: 4, r: 4, category: "super", priority: 5 },
    "Winnow": { q: 0, r: 4, category: "super", priority: 5 },
    "ChaoticAmbition": { q: -4, r: 4, category: "super", priority: 5 },
    "Rebirth": { q: -5, r: -2, category: "super", priority: 5 },
    "PriorityZero": { q: -4, r: -4, category: "super", priority: 5 }
  };

  /**
   * Categories define different types of mods
   */
  const MOD_CATEGORIES = {
    weapon: { color: "rgb(255, 100, 100)", name: "Weapon" },
    shield: { color: "rgb(100, 100, 255)", name: "Shield" },
    body: { color: "rgb(100, 255, 100)", name: "Body" },
    special: { color: "rgb(255, 255, 100)", name: "Special" },
    super: { color: "rgb(255, 100, 255)", name: "Super" }
  };

  /**
   * Grid layout configuration
   */
  const GRID_CONFIG = {
    // Maximum extent of the mod grid
    maxRadius: 6,
    
    // Center position in the baseline 1920x1080 layout
    baselineCenter: { x: 960, y: 540 },
    
    // Hex dimensions
    hexRadius: 24,        // From center to vertex
    hexWidth: 42,         // Sprite width
    hexHeight: 48,        // Sprite height
    
    // Spacing between hex centers
    horizontalSpacing: 36, // 1.5 * hexRadius * 2
    verticalSpacing: 42    // sqrt(3) * hexRadius
  };

  /**
   * Helper functions for working with mod positions
   */
  const ModPositionHelper = {
    /**
     * Get all mods in a specific category
     */
    getModsByCategory: (category) => {
      const result = [];
      for (const [modName, data] of Object.entries(MOD_POSITIONS)) {
        if (data.category === category) {
          result.push({ name: modName, ...data });
        }
      }
      return result;
    },

    /**
     * Get all mods within a certain distance from center
     */
    getModsByRadius: (maxRadius) => {
      const result = [];
      for (const [modName, data] of Object.entries(MOD_POSITIONS)) {
        const distance = Math.max(Math.abs(data.q), Math.abs(data.r), Math.abs(-data.q - data.r));
        if (distance <= maxRadius) {
          result.push({ name: modName, distance, ...data });
        }
      }
      return result.sort((a, b) => a.distance - b.distance);
    },

    /**
     * Get all mods at a specific priority level
     */
    getModsByPriority: (priority) => {
      const result = [];
      for (const [modName, data] of Object.entries(MOD_POSITIONS)) {
        if (data.priority === priority) {
          result.push({ name: modName, ...data });
        }
      }
      return result;
    },

    /**
     * Find mods near a specific position
     */
    getModsNearPosition: (q, r, radius = 1) => {
      const result = [];
      for (const [modName, data] of Object.entries(MOD_POSITIONS)) {
        const distance = Math.max(
          Math.abs(data.q - q),
          Math.abs(data.r - r),
          Math.abs((-data.q - data.r) - (-q - r))
        );
        if (distance <= radius) {
          result.push({ name: modName, distance, ...data });
        }
      }
      return result.sort((a, b) => a.distance - b.distance);
    },

    /**
     * Check if a mod exists at a specific position
     */
    getModAtPosition: (q, r) => {
      for (const [modName, data] of Object.entries(MOD_POSITIONS)) {
        if (data.q === q && data.r === r) {
          return { name: modName, ...data };
        }
      }
      return null;
    },

    /**
     * Get the pixel coordinates for a mod at a given scale and center
     */
    getPixelCoordinates: (modName, scaleFactor = 1.0, gridCenter = GRID_CONFIG.baselineCenter) => {
      const modData = MOD_POSITIONS[modName];
      if (!modData) return null;

      const hexRadius = GRID_CONFIG.hexRadius * scaleFactor;
      const x = hexRadius * (3/2 * modData.q) + gridCenter.x;
      const y = hexRadius * (Math.sqrt(3)/2 * modData.q + Math.sqrt(3) * modData.r) + gridCenter.y;

      return { x, y };
    },

    /**
     * Convert pixel coordinates back to mod name (nearest match)
     */
    getModFromPixelCoordinates: (pixelX, pixelY, scaleFactor = 1.0, gridCenter = GRID_CONFIG.baselineCenter) => {
      const hexRadius = GRID_CONFIG.hexRadius * scaleFactor;
      
      // Convert pixel to axial coordinates
      const relX = pixelX - gridCenter.x;
      const relY = pixelY - gridCenter.y;
      
      const q = Math.round((2/3 * relX) / hexRadius);
      const r = Math.round((-1/3 * relX + Math.sqrt(3)/3 * relY) / hexRadius);

      return ModPositionHelper.getModAtPosition(q, r);
    },

    /**
     * Validate mod position data integrity
     */
    validatePositions: () => {
      const issues = [];
      const positions = new Set();

      for (const [modName, data] of Object.entries(MOD_POSITIONS)) {
        // Check for duplicate positions
        const posKey = `${data.q},${data.r}`;
        if (positions.has(posKey)) {
          issues.push(`Duplicate position ${posKey} for mod ${modName}`);
        }
        positions.add(posKey);

        // Check for valid categories
        if (!MOD_CATEGORIES[data.category]) {
          issues.push(`Invalid category '${data.category}' for mod ${modName}`);
        }

        // Check for reasonable coordinates
        if (Math.abs(data.q) > GRID_CONFIG.maxRadius || Math.abs(data.r) > GRID_CONFIG.maxRadius) {
          issues.push(`Mod ${modName} position ${posKey} exceeds max radius ${GRID_CONFIG.maxRadius}`);
        }
      }

      return issues;
    }
  };

  // Export the reference data
  global.NovaModPositions = {
    MOD_POSITIONS,
    MOD_CATEGORIES,
    GRID_CONFIG,
    ModPositionHelper
  };

  // Validate positions on load
  if (typeof console !== 'undefined') {
    const issues = ModPositionHelper.validatePositions();
    if (issues.length > 0) {
      console.warn('Mod position validation issues:', issues);
    } else {
      console.log(`✅ Loaded ${Object.keys(MOD_POSITIONS).length} mod positions successfully`);
    }
  }

})(typeof window !== 'undefined' ? window : global);
