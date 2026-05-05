/**
 * Puppeteer script: upload invoices to client platform (browser automation).
 *
 * Use when there is no API — emulates a user logging in and uploading files.
 *
 * HOW TO RUN:
 *   From PavleTekBackend directory:
 *     node scripts/uploadInvoicesPuppeteer.js
 *
 *   Or with env vars inline:
 *     UPLOAD_PLATFORM_URL=https://client-platform.com node scripts/uploadInvoicesPuppeteer.js
 *
 * OPTIONS (env):
 *   UPLOAD_PLATFORM_URL  — Base URL (default: Kibusasys login).
 *   PLATFORM_EMAIL      — Login email (default: pavle@pavletek.com).
 *   PLATFORM_PASSWORD   — Login password (set in .env for security).
 *   PUPPETEER_HEADLESS  — Set to "true" to run browser in background.
 *   PUPPETEER_SLOW_MO   — Optional, e.g. 100 (ms) to slow down actions for debugging.
 *
 * WORKFLOW:
 *   1. Run with headless=false, go to the platform, log in manually if needed.
 *   2. Inspect the page (right‑click → Inspect) and note selectors for: login fields, upload button, file input.
 *   3. Fill in the steps below (login, navigate to upload, set file input, submit).
 *   4. Optionally wire in your DB/R2: fetch invoices and PDF buffers, then pass paths/buffers into upload steps.
 */

require('dotenv').config();
const prisma = require('../src/lib/prisma');

const UPLOAD_PLATFORM_URL = process.env.UPLOAD_PLATFORM_URL || 'https://www.kibusasys.com/web/login';
const HEADLESS = process.env.PUPPETEER_HEADLESS === 'true';
const SLOW_MO = process.env.PUPPETEER_SLOW_MO ? parseInt(process.env.PUPPETEER_SLOW_MO, 10) : 0;

const PLATFORM_EMAIL = process.env.PLATFORM_EMAIL || '';
const PLATFORM_PASSWORD = process.env.PLATFORM_PASSWORD || '';

// Parse --invoiceId=N argument
const invoiceIdArg = process.argv.find(arg => arg.startsWith('--invoiceId='));
const invoiceId = invoiceIdArg ? parseInt(invoiceIdArg.split('=')[1]) : null;

async function run() {
  console.log('Invoice ID:', invoiceId || 'none (manual run)');
  // eslint-disable-next-line global-require
  const puppeteer = require('puppeteer');

  const browser = await puppeteer.launch({
    headless: HEADLESS,
    slowMo: SLOW_MO,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();

  try {
    console.log('Opening platform:', UPLOAD_PLATFORM_URL);
    await page.goto(UPLOAD_PLATFORM_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // ——— Login (Odoo/Kibusasys form: #login, #password, submit) ———
    await page.waitForSelector('#login', { timeout: 10000 });
    await page.type('#login', PLATFORM_EMAIL, { delay: 50 });
    await page.type('#password', PLATFORM_PASSWORD, { delay: 50 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
      page.click('button[type="submit"].btn.btn-primary'),
    ]);
    console.log('Logged in.');

    // ——— Next: navigate to upload area and upload files (customize when ready) ———
    console.log('Pause to inspect. Close the browser when done, or extend the script.');
    await new Promise((r) => setTimeout(r, 15000));

    // Update status to completed if invoiceId is provided
    if (invoiceId) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          platformUploadStatus: 'completed',
          platformUploadError: null,
        },
      });
      console.log(`Invoice ${invoiceId} marked as completed in DB.`);
    }
  } catch (err) {
    console.error('Error during Puppeteer run:', err);
    if (invoiceId) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          platformUploadStatus: 'failed',
          platformUploadError: err.message || String(err),
        },
      }).catch(console.error);
    }
    throw err;
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Puppeteer script failed:', err);
  process.exit(1);
});
