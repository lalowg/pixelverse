// PIXELVERSE — The Drift: location codex shared by the 3D world, the SVG fallback and the HUD.
// Angles are in degrees around the island centre; r is the distance from the centre in world units.

export const LOCATIONS = [
  {
    id: 'beacon', no: '01', name: 'Beacon Point', biome: 'Cloud-cliff lighthouse',
    angle: 0, r: 4.85, tile: 1.1, anchorY: 3.5, focusY: 1.5, dist: 7.2,
    lore: 'The keeper of Beacon Point has never met another keeper, yet every night she lights the lamp anyway. In the Drift, islands wander. The beam is how they find each other again.',
    hook: 'Follow the beam on a moonless night and something on a distant island blinks back.',
    facts: [['Terrain', 'Wind-cut cliff'], ['Soundscape', 'A foghorn tuned to F'], ['Best seen', 'After dark']],
    accent: '#FFE45D'
  },
  {
    id: 'hushwood', no: '02', name: 'Hushwood', biome: 'Singing forest',
    angle: 62, r: 3.5, tile: 1.5, anchorY: 2.4, focusY: 0.9, dist: 6.8,
    lore: 'The trees here hum at a pitch only foxes can hear. The fireflies are not insects. They are the forest’s memory, carrying fragments of every conversation held beneath the canopy.',
    hook: 'Sit still long enough and the fireflies replay a voice you recognise.',
    facts: [['Terrain', 'Old-growth canopy'], ['Soundscape', 'A low, choral hum'], ['Best seen', 'Dusk']],
    accent: '#FF5DA2'
  },
  {
    id: 'gearwind', no: '03', name: 'Gearwind', biome: 'Windmill village',
    angle: 122, r: 3.7, tile: 1.6, anchorY: 2.9, focusY: 0.9, dist: 7.4,
    lore: 'Eleven families, three windmills and one rule: the sails never stop. They don’t grind flour. They wind the great spring under the village that keeps the island’s clock, and the clock keeps the island in the sky.',
    hook: 'One mill turned backwards last night. Nobody admits to touching it.',
    facts: [['Terrain', 'Terraced meadow'], ['Soundscape', 'Creaking sails, chimes'], ['Best seen', 'Morning']],
    accent: '#5DF2FF'
  },
  {
    id: 'cinder', no: '04', name: 'Cinder Crown', biome: 'Ember caldera',
    angle: 182, r: 3.1, tile: 1.75, anchorY: 3.6, focusY: 1.2, dist: 8.2,
    lore: 'Less a volcano than a heart. The Crown breathes warm air up through the rock and the island floats on it like a paper lantern. When it sleeps, the whole Drift sinks a little lower.',
    hook: 'The Crown has started snoring. Someone needs to wake it, gently.',
    facts: [['Terrain', 'Basalt caldera'], ['Soundscape', 'Deep, slow breathing'], ['Best seen', 'Night']],
    accent: '#FFB547'
  },
  {
    id: 'skyfall', no: '05', name: 'Skyfall', biome: 'Edge falls',
    angle: 242, r: 4.75, tile: 1.3, anchorY: 2.0, focusY: 0.2, dist: 7.0,
    lore: 'The river reaches the edge and keeps going. Skyfall pours into open sky without ever landing; by morning the same water returns as rain over Hushwood. Locals drop letters in and wait for replies.',
    hook: 'A letter came back today, addressed to someone who hasn’t been born yet.',
    facts: [['Terrain', 'Spring-fed pool'], ['Soundscape', 'White water, birdsong'], ['Best seen', 'Dawn']],
    accent: '#5DF2FF'
  },
  {
    id: 'ring', no: '06', name: 'The Quiet Ring', biome: 'Ancient ruin',
    angle: 302, r: 3.45, tile: 1.45, anchorY: 2.9, focusY: 1.0, dist: 6.9,
    lore: 'Seven stones, one floating crystal and no sound at all. Step inside the Ring and the world mutes, as if holding its breath. Old maps mark it as a door. Old maps are usually right.',
    hook: 'Touch the crystal to enter another reality, if you’re ready to leave this one.',
    facts: [['Terrain', 'Standing stones'], ['Soundscape', 'Perfect silence'], ['Best seen', 'Any hour']],
    accent: '#FF5DA2'
  }
];

export const TIMES = ['dusk', 'night', 'dawn'];
export const TIME_LABEL = { dusk: 'Dusk', night: 'Night', dawn: 'Dawn' };
