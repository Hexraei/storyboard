// Canvas compositor: lays the strip out and exports a shareable PNG.

export interface ExportPanel {
  img: HTMLImageElement;
  caption: string;
}

const INK = '#1a1a1a';
const PAPER = '#fff8e7';
const YELLOW = '#ffd43b';

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

export function exportStrip(title: string, panels: ExportPanel[]): HTMLCanvasElement {
  const cols = panels.length <= 3 ? panels.length : 2;
  const rows = Math.ceil(panels.length / cols);
  const pw = 900;
  const ph = 675;
  const gutter = 28;
  const margin = 56;
  const headerH = 150;
  const captionFont = 30;
  const captionPad = 14;
  const border = 6;

  const canvas = document.createElement('canvas');
  const measure = canvas.getContext('2d')!;
  measure.font = `${captionFont}px "Space Grotesk", sans-serif`;
  const captionHeights = panels.map(
    (p) => wrapText(measure, p.caption, pw - captionPad * 2).length * (captionFont + 8) + captionPad * 2,
  );
  const rowHeights: number[] = [];
  for (let r = 0; r < rows; r++) {
    let h = 0;
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (i < panels.length) h = Math.max(h, ph + captionHeights[i]);
    }
    rowHeights.push(h);
  }

  const width = margin * 2 + cols * pw + (cols - 1) * gutter;
  const height = margin * 2 + headerH + rowHeights.reduce((a, b) => a + b, 0) + (rows - 1) * gutter + 70;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);

  // halftone dots in the header band
  ctx.fillStyle = YELLOW;
  ctx.fillRect(0, 0, width, headerH + margin / 2);
  ctx.fillStyle = 'rgba(26,26,26,0.12)';
  for (let dy = 10; dy < headerH + margin / 2; dy += 22) {
    for (let dx = 10 + ((dy / 22) % 2) * 11; dx < width; dx += 22) {
      ctx.beginPath();
      ctx.arc(dx, dy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = INK;
  ctx.font = `84px "Bangers", "Comic Sans MS", cursive`;
  ctx.textBaseline = 'middle';
  const titleX = margin;
  ctx.fillText(title.toUpperCase(), titleX, margin / 2 + headerH / 2, width - margin * 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, headerH + margin / 2);
  ctx.lineTo(width, headerH + margin / 2);
  ctx.stroke();

  let y = margin + headerH;
  for (let r = 0; r < rows; r++) {
    let x = margin;
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (i >= panels.length) break;
      const capH = captionHeights[i];
      ctx.fillStyle = INK;
      ctx.fillRect(x - border, y - border, pw + border * 2, ph + border * 2);
      drawCoverImage(ctx, panels[i].img, x, y, pw, ph);
      // caption box
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.fillRect(x + 10, y + ph - 6, pw - 20, capH);
      ctx.strokeRect(x + 10, y + ph - 6, pw - 20, capH);
      ctx.fillStyle = INK;
      ctx.font = `${captionFont}px "Space Grotesk", sans-serif`;
      const lines = wrapText(ctx, panels[i].caption, pw - 20 - captionPad * 2);
      lines.forEach((line, li) => {
        ctx.fillText(line, x + 10 + captionPad, y + ph - 6 + captionPad + (captionFont + 8) * li + captionFont / 2);
      });
      x += pw + gutter;
    }
    y += rowHeights[r] + gutter + 6;
  }

  ctx.font = `26px "Space Grotesk", sans-serif`;
  ctx.fillStyle = INK;
  ctx.textAlign = 'right';
  ctx.fillText('made with Storyboard', width - margin, height - margin / 2);
  ctx.textAlign = 'left';
  return canvas;
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}
