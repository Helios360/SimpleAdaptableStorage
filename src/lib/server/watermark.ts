import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';

const WATERMARK_PATH = path.resolve('./static/watermark.png');

/** Stamps the first page of a PDF with the brand watermark. No-op on failure. */
export async function watermarkPdf(srcAbs: string): Promise<boolean> {
  try {
    const [pdfBytes, wmBytes] = await Promise.all([readFile(srcAbs), readFile(WATERMARK_PATH)]);
    const pdf = await PDFDocument.load(pdfBytes);
    const wm = await pdf.embedPng(wmBytes);
    const dims = wm.scale(0.1);
    const first = pdf.getPages()[0];
    const { width } = first.getSize();
    first.drawImage(wm, {
      x: width - dims.width - 5,
      y: dims.height - 70,
      width: dims.width,
      height: dims.height,
      opacity: 0.7
    });
    await writeFile(srcAbs, await pdf.save());
    return true;
  } catch (e) {
    console.warn('[watermark] failed:', (e as Error).message);
    return false;
  }
}
