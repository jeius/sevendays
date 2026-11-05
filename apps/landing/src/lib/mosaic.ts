// The mosaic wall's deterministic span rhythm (#164 Round 2, owner-ruled):
// every 7th tile runs large (2×2), every 7th+3 runs wide (2×1), the rest
// are singles — over fixed row heights with dense packing, so the wall
// stays balanced while a few photos run large. Pure: the grid component
// maps indices through this and the seam pins the rhythm.
export function spanFor(i: number): string {
  return i % 7 === 0 ? 'col-span-2 row-span-2' : i % 7 === 3 ? 'col-span-2' : '';
}
