// js/parts.js
// Actual Computer Parts definition for Carter PCs 3-Lane Runner

export const COMPUTER_PARTS = [
  {
    id: 'gpu_rtx4090',
    name: 'RTX 4090 24GB',
    type: 'obstacle',
    svg: 'assets/parts/gpu_rtx4090.svg',
    width: 140,
    height: 78,
    hitbox: { w: 110, h: 54 },
    heightLevel: 'ground', // can jump over!
    rarity: 'legendary',
    carterComment: 'Careful with that 4090! That costs more than my car!',
    points: 250
  },
  {
    id: 'cpu_processor',
    name: 'Core i9-14900KS',
    type: 'obstacle',
    svg: 'assets/parts/cpu_processor.svg',
    width: 90,
    height: 90,
    hitbox: { w: 70, h: 70 },
    heightLevel: 'ground',
    rarity: 'rare',
    carterComment: 'Watch the IHS! Don’t overheat the silicon!',
    points: 180
  },
  {
    id: 'motherboard',
    name: 'Z790 Gaming Motherboard',
    type: 'obstacle',
    svg: 'assets/parts/motherboard.svg',
    width: 110,
    height: 110,
    hitbox: { w: 90, h: 90 },
    heightLevel: 'ground',
    rarity: 'epic',
    carterComment: 'Don’t snap the PCIe latches!',
    points: 220
  },
  {
    id: 'ram_rgb',
    name: 'DDR5 64GB RGB RAM',
    type: 'obstacle',
    svg: 'assets/parts/ram_rgb.svg',
    width: 120,
    height: 44,
    hitbox: { w: 100, h: 36 },
    heightLevel: 'ground',
    rarity: 'uncommon',
    carterComment: 'Push till it clicks! Dual channel speed!',
    points: 140
  },
  {
    id: 'aio_cooler',
    name: '240mm AIO Liquid Cooler',
    type: 'obstacle',
    svg: 'assets/parts/aio_cooler.svg',
    width: 115,
    height: 80,
    hitbox: { w: 95, h: 65 },
    heightLevel: 'ground',
    rarity: 'rare',
    carterComment: 'Keep the tubes untangled, liquid cooling active!',
    points: 190
  },
  {
    id: 'psu_power',
    name: '1000W 80+ Gold PSU',
    type: 'obstacle',
    svg: 'assets/parts/psu_power.svg',
    width: 100,
    height: 82,
    hitbox: { w: 80, h: 66 },
    heightLevel: 'ground',
    rarity: 'uncommon',
    carterComment: 'Only use cables that came with this PSU!',
    points: 160
  },
  {
    id: 'nvme_ssd',
    name: 'Gen5 NVMe SSD 4TB',
    type: 'obstacle',
    svg: 'assets/parts/nvme_ssd.svg',
    width: 115,
    height: 40,
    hitbox: { w: 95, h: 32 },
    heightLevel: 'ground',
    rarity: 'common',
    carterComment: '14,000 MB/s speed right under our wheels!',
    points: 130
  },
  {
    id: 'bent_pins',
    name: '⚠️ Bent CPU Pins Hazard',
    type: 'obstacle',
    svg: 'assets/parts/bent_pins.svg',
    width: 95,
    height: 58,
    hitbox: { w: 80, h: 48 },
    heightLevel: 'ground',
    rarity: 'danger',
    carterComment: 'NOOO! THE CPU PINS! Jump over it!',
    points: 300
  },
  {
    id: 'thermal_paste',
    name: 'Thermal Paste Tube',
    type: 'collectible',
    svg: 'assets/parts/thermal_paste.svg',
    width: 90,
    height: 32,
    hitbox: { w: 60, h: 28 },
    heightLevel: 'ground',
    rarity: 'bonus',
    carterComment: 'Pea-sized drop! Perfect thermal conductivity!',
    points: 500
  }
];

export const CARTER_QUOTES = {
  nearMiss: [
    'Close call!',
    'Calculated!',
    'Smooth drift!',
    'Precision build!'
  ],
  jump: [
    'Airborne!',
    'Yeet!',
    'Vaulting the GPU!',
    'Over the motherboard!'
  ],
  collect: [
    '+500 Thermal Paste!',
    'Cooling boosted!',
    'Temps dropped 10°C!',
    'Pea size perfection!'
  ],
  crash: [
    'You bent the CPU socket pins!',
    'GPU sag took us down!',
    'Forgot the Motherboard I/O shield!',
    'Thermal throttled to 0 FPS!',
    'Cable management caught in the fan!',
    'Forgot to remove the CPU cooler plastic sticker!'
  ]
};
