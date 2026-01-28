'use client';

import { Mafs, Coordinates, Plot, Theme } from "mafs";

export default function MathGraph({ fn, color = Theme.blue }: { fn: (x: number) => number; color?: string }) {
  return (
    <div style={{ margin: '15px 0', textAlign: 'center' }}>
      <Mafs height={300}>
        <Coordinates.Cartesian />
        <Plot.OfX y={fn} color={color} />
      </Mafs>
    </div>
  );
}
