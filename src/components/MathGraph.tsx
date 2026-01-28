'use client';

import { Mafs, Coordinates, Plot, Theme } from "mafs";

export default function MathGraph({ fn, label, color = Theme.blue }: { fn: (x: number) => number; label?: string; color?: string }) {
  return (
    <div style={{ margin: '15px 0', textAlign: 'center' }}>
      <Mafs height={300}>
        <Coordinates.Cartesian />
        <Plot.OfX y={fn} color={color} label={label} />
      </Mafs>
    </div>
  );
}
