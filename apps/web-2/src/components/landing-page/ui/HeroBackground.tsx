"use client";
import { useEffect, useRef } from "react";

type Grid = { alive: boolean; opacity: number }[][];

const GameOfLife = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const cellSize = 6;
    const cols = Math.floor(canvas.width / cellSize);
    const rows = Math.floor(canvas.height / cellSize);
    const transitionSpeed = 0.2; // Controls fade speed

    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

    // Weight each cell so the dots form an "accretion disk" shape:
    // a denser ring-ish band near the center and sparse edges.
    const weights: number[][] = Array.from({ length: rows }, (_, i) =>
      Array.from({ length: cols }, (_, j) => {
        const x = (j + 0.5) * cellSize;
        const y = (i + 0.5) * cellSize;

        const nx = (x - canvas.width / 2) / (canvas.width / 2);
        const ny = (y - canvas.height / 2) / (canvas.height / 2);

        // Ellipse stretch so it reads more like a disk.
        const ex = nx / 1.25;
        const ey = ny / 0.9;
        const r = Math.sqrt(ex * ex + ey * ey);

        // Ring band + subtle center glow.
        const ringRadius = 0.48;
        const ringSigma = 0.16;
        const ring = Math.exp(-((r - ringRadius) ** 2) / (2 * ringSigma ** 2));

        const coreSigma = 0.22;
        const core = 0.35 * Math.exp(-(r ** 2) / (2 * coreSigma ** 2));

        return clamp01(ring + core);
      }),
    );

    let grid: Grid = Array.from({ length: rows }, (_, i) =>
      Array.from({ length: cols }, (_, j) => {
        const w = weights[i][j];
        const spawnChance = 0.03 + 0.22 * w;
        const alive = Math.random() < spawnChance;
        return {
          alive,
          opacity: alive ? 0.3 : 0,
        };
      }),
    );

    const countNeighbors = (grid: Grid, x: number, y: number): number => {
      let sum = 0;
      for (let i = -1; i < 2; i++) {
        for (let j = -1; j < 2; j++) {
          const row = (x + i + rows) % rows;
          const col = (y + j + cols) % cols;
          sum += grid[row][col].alive ? 1 : 0;
        }
      }
      sum -= grid[x][y].alive ? 1 : 0;
      return sum;
    };

    const draw = () => {
      ctx.fillStyle = "#F9FAFB";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update opacities + draw dots.
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          const cell = grid[i][j];
          if (cell.alive && cell.opacity < 1) {
            cell.opacity = Math.min(cell.opacity + transitionSpeed, 0.45);
          } else if (!cell.alive && cell.opacity > 0) {
            cell.opacity = Math.max(cell.opacity - transitionSpeed, 0);
          }

          if (cell.opacity > 0) {
            const w = weights[i][j];
            // Keep edges clean while letting the ring pop.
            const alpha = cell.opacity * (0.1 + 0.9 * w);
            if (alpha <= 0.001) continue;

            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.beginPath();
            ctx.arc(
              j * cellSize + cellSize / 2,
              i * cellSize + cellSize / 2,
              1,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
      }

      const next = grid.map((row, i) =>
        row.map((cell, j) => {
          const neighbors = countNeighbors(grid, i, j);
          const willBeAlive = cell.alive
            ? neighbors >= 2 && neighbors <= 3
            : neighbors === 3;
          return {
            alive: willBeAlive,
            opacity: cell.opacity,
          };
        }),
      );

      grid = next;
      setTimeout(() => {
        animationFrameId = requestAnimationFrame(draw);
      }, 125);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="pointer-events-none overflow-hidden select-none mask-[radial-gradient(760px_420px_at_center,#000_0%,transparent_70%)]">
      <canvas ref={canvasRef} width={1500} height={600} />
    </div>
  );
};

export default GameOfLife;
