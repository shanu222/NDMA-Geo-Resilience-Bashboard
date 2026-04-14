import pdfkit from 'pdfkit';
import { query } from '../db.js';
import { nationalRiskIndex } from './riskService.js';

export async function buildRiskPdf(): Promise<Buffer> {
  const national = await nationalRiskIndex();
  const { rows: alerts } = await query(
    `SELECT type, severity, message, created_at FROM alerts ORDER BY created_at DESC LIMIT 20`,
  );

  const doc = new pdfkit({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(18).text('NDMA GeoResilience — Risk & Cost Summary', { align: 'center' });
  doc.moveDown();
  doc.fontSize(11).text(`Generated: ${new Date().toISOString()}`);
  doc.text(`National risk index (composite): ${national}`);
  doc.moveDown();
  doc.fontSize(13).text('Recent alerts');
  doc.fontSize(10);
  for (const a of alerts as { type: string; severity: string; message: string; created_at: Date }[]) {
    doc.text(`• [${a.severity}] ${a.type}: ${a.message}`, { width: 500 });
  }
  doc.moveDown();
  doc.fontSize(10).text(
    'This system must operate as a real-time national disaster command platform for NDMA, capable of monitoring, predicting, and responding to monsoon and other disasters across Pakistan.',
    { width: 500 },
  );
  doc.end();
  return done;
}
