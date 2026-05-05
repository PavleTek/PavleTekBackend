const prisma = require('../../lib/prisma');
const { spawn } = require('child_process');
const path = require('path');

module.exports = {
  name: 'Run Scheduled Platform Uploads',
  schedule: '0 * * * *', // Every hour at minute :00, same as emails
  handler: async () => {
    const now = new Date();
    console.log(`[PavleTek-Scheduler] Checking for scheduled platform uploads at ${now.toISOString()}`);

    const invoices = await prisma.invoice.findMany({
      where: {
        platformUploadStatus: 'scheduled',
        platformUploadScheduledAt: { lte: now },
        invoicePdfR2Key: { not: null },
      },
    });

    if (invoices.length === 0) {
      return;
    }

    console.log(`[PavleTek-Scheduler] Found ${invoices.length} invoice(s) to upload to platform.`);

    for (const invoice of invoices) {
      try {
        console.log(`[PavleTek-Scheduler] Triggering platform upload for invoice ${invoice.id}`);

        // Update status to running
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            platformUploadStatus: 'running',
            platformUploadAt: new Date(),
            platformUploadError: null,
          },
        });

        // Spawn script as detached child process
        const scriptPath = path.resolve(__dirname, '../../../scripts/uploadInvoicesPuppeteer.js');
        const child = spawn('node', [scriptPath, `--invoiceId=${invoice.id}`], {
          detached: true,
          stdio: 'ignore',
          env: { ...process.env },
        });

        child.on('error', async (err) => {
          console.error(`[PavleTek-Scheduler] Failed to spawn Puppeteer script for invoice ${invoice.id}:`, err);
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              platformUploadStatus: 'failed',
              platformUploadError: `Failed to spawn process: ${err.message}`,
            },
          }).catch(console.error);
        });

        child.unref();
      } catch (err) {
        console.error(`[PavleTek-Scheduler] Error processing scheduled upload for invoice ${invoice.id}:`, err);
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            platformUploadStatus: 'failed',
            platformUploadError: err.message || String(err),
          },
        }).catch(console.error);
      }
    }
  },
};
