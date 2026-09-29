// js/parts.js
// 5-Lane Cartoon Computer Parts Definition

export const COMPUTER_PARTS = [
  {
    id: 'gpu_rtx4090',
    name: 'RTX 4090',
    type: 'obstacle',
    svg: 'assets/parts/gpu_rtx4090.svg',
    width: 88,
    height: 50,
    hitbox: { w: 72, h: 40 },
    points: 250
  },
  {
    id: 'cpu_processor',
    name: 'Intel Core i9',
    type: 'obstacle',
    svg: 'assets/parts/cpu_processor.svg',
    width: 68,
    height: 68,
    hitbox: { w: 56, h: 56 },
    points: 180
  },
  {
    id: 'motherboard',
    name: 'Motherboard',
    type: 'obstacle',
    svg: 'assets/parts/motherboard.svg',
    width: 76,
    height: 76,
    hitbox: { w: 64, h: 64 },
    points: 220
  },
  {
    id: 'ram_rgb',
    name: 'RGB RAM Stick',
    type: 'obstacle',
    svg: 'assets/parts/ram_rgb.svg',
    width: 84,
    height: 36,
    hitbox: { w: 70, h: 28 },
    points: 140
  },
  {
    id: 'aio_cooler',
    name: 'Liquid Cooler',
    type: 'obstacle',
    svg: 'assets/parts/aio_cooler.svg',
    width: 80,
    height: 58,
    hitbox: { w: 68, h: 48 },
    points: 190
  },
  {
    id: 'psu_power',
    name: 'Power Supply',
    type: 'obstacle',
    svg: 'assets/parts/psu_power.svg',
    width: 72,
    height: 60,
    hitbox: { w: 60, h: 50 },
    points: 160
  },
  {
    id: 'nvme_ssd',
    name: 'NVMe SSD',
    type: 'obstacle',
    svg: 'assets/parts/nvme_ssd.svg',
    width: 82,
    height: 32,
    hitbox: { w: 68, h: 24 },
    points: 130
  },
  {
    id: 'bent_pins',
    name: 'Bent CPU Pins!',
    type: 'obstacle',
    svg: 'assets/parts/bent_pins.svg',
    width: 72,
    height: 46,
    hitbox: { w: 60, h: 38 },
    points: 300
  },
  {
    id: 'thermal_paste',
    name: 'Thermal Paste',
    type: 'collectible',
    svg: 'assets/parts/thermal_paste.svg',
    width: 72,
    height: 34,
    hitbox: { w: 54, h: 26 },
    points: 500
  }
];
