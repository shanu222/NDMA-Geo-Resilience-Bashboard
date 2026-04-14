import mongoose from 'mongoose';
import pdfkit from 'pdfkit';
import { hasDatabase } from '../db.js';
import { Alert } from '../models.js';
import { nationalRiskIndex } from './riskService.js';

export async function buildRiskPdf(): Promise<Buffer> {
  let national = 55;
  const alerts: { type: string; severity: string; message: string; created_at: Date }[] = [];

  if (hasDatabase && mongoose.connection.readyState === 1) {
    try {
      national = await nationalRiskIndex();
      const rows = await Alert.find().sort({ created_at: -1 }).limit(20).lean();
      for (const a of rows) {
        alerts.push({
          type: a.type,
          severity: a.severity,
          message: a.message,
          created_at: a.created_at,
        });
      }
    } catch (e) {
      console.error('[pdf]', e);
    }
  }

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
  if (!hasDatabase || mongoose.connection.readyState !== 1) {
    doc.fontSize(10).text('Note: Database not connected — values are placeholders.', { width: 500 });
  }
  doc.moveDown();
  doc.fontSize(13).text('Recent alerts');
  doc.fontSize(10);
  if (alerts.length === 0) {
    doc.text('(No alerts in database.)', { width: 500 });
  }
  for (const a of alerts) {
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
