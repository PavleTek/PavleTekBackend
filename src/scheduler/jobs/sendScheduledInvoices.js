const prisma = require('../../lib/prisma');
const r2Service = require('../../services/r2Service');
const { sendEmail } = require('../../services/emailService');

// Replace date variables in template strings (${date}, ${englishMonth}, ${spanishMonth}, ${year})
function replaceDateVariables(template, dateStr) {
  if (!template) return '';
  if (!dateStr) return template;
  let dateObj;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    dateObj = new Date(y, m - 1, d);
  } else {
    dateObj = new Date(dateStr);
  }
  if (isNaN(dateObj.getTime())) return template;
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const year = dateObj.getFullYear();
  const formattedDate = `${month}/${day}/${year}`;
  const englishMonth = dateObj.toLocaleString('en-US', { month: 'long' });
  const spanishMonthLower = dateObj.toLocaleString('es-ES', { month: 'long' });
  const spanishMonth =
    spanishMonthLower.charAt(0).toUpperCase() + spanishMonthLower.slice(1);
  return template
    .replace(/\$\{date\}/g, formattedDate)
    .replace(/\$\{englishMonth\}/g, englishMonth)
    .replace(/\$\{spanishMonth\}/g, spanishMonth)
    .replace(/\$\{year\}/g, String(year));
}

function parseEmailArray(emails) {
  if (!emails) return [];
  if (Array.isArray(emails)) return emails;
  if (typeof emails === 'string') {
    try {
      const parsed = JSON.parse(emails);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return emails
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);
    }
  }
  return [];
}

module.exports = {
  name: 'Send Scheduled Invoices',
  schedule: '0 * * * *', // Every hour at minute :00
  handler: async () => {
    const now = new Date();
    const invoices = await prisma.invoice.findMany({
      where: {
        scheduledStatus: 'pending',
        scheduledSendAt: { lte: now },
        invoicePdfR2Key: { not: null },
      },
    });

    if (invoices.length === 0) {
      return;
    }

    let sent = 0;
    let failed = 0;

    for (const invoice of invoices) {
      try {
        const data = invoice.scheduledEmailData;
        if (!data || !data.fromEmail || !data.toEmails || !data.subject || !data.content) {
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              scheduledStatus: 'failed',
              scheduledError: 'Missing scheduledEmailData or required email fields',
            },
          });
          failed++;
          continue;
        }

        const toList = parseEmailArray(data.toEmails);
        if (toList.length === 0) {
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              scheduledStatus: 'failed',
              scheduledError: 'No recipient emails',
            },
          });
          failed++;
          continue;
        }

        const attachments = [];
        if (invoice.invoicePdfR2Key) {
          const buf = await r2Service.getFile(invoice.invoicePdfR2Key);
          const filename =
            invoice.invoicePdfR2Key.split('/').pop() || 'invoice.pdf';
          attachments.push({
            filename,
            content: buf,
            contentType: 'application/pdf',
          });
        }
        if (invoice.asPdfR2Key) {
          const buf = await r2Service.getFile(invoice.asPdfR2Key);
          const filename = invoice.asPdfR2Key.split('/').pop() || 'as.pdf';
          attachments.push({
            filename,
            content: buf,
            contentType: 'application/pdf',
          });
        }

        const invoiceDateStr = invoice.date
          ? new Date(invoice.date).toISOString().split('T')[0]
          : '';
        const finalSubject = replaceDateVariables(data.subject, invoiceDateStr);
        const finalContent = replaceDateVariables(data.content, invoiceDateStr);

        await sendEmail({
          fromEmail: data.fromEmail.trim().toLowerCase(),
          toEmails: toList.map((e) => e.trim().toLowerCase()),
          ccEmails:
            data.ccEmails && parseEmailArray(data.ccEmails).length > 0
              ? parseEmailArray(data.ccEmails).map((e) => e.trim().toLowerCase())
              : undefined,
          bccEmails:
            data.bccEmails && parseEmailArray(data.bccEmails).length > 0
              ? parseEmailArray(data.bccEmails).map((e) => e.trim().toLowerCase())
              : undefined,
          subject: finalSubject,
          content: finalContent,
          isHtml: false,
          attachments,
        });

        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            scheduledStatus: 'sent',
            scheduledSentAt: new Date(),
            sent: true,
            scheduledError: null,
          },
        });
        sent++;
      } catch (err) {
        console.error(
          `[PavleTek-Scheduler] Failed to send scheduled invoice ${invoice.id}:`,
          err
        );
        await prisma.invoice
          .update({
            where: { id: invoice.id },
            data: {
              scheduledStatus: 'failed',
              scheduledError: err.message || String(err),
            },
          })
          .catch((updateErr) => {
            console.error(
              `[PavleTek-Scheduler] Failed to update invoice ${invoice.id} status:`,
              updateErr
            );
          });
        failed++;
      }
    }

    if (sent > 0 || failed > 0) {
      console.log(
        `[PavleTek-Scheduler] Send scheduled invoices: ${sent} sent, ${failed} failed`
      );
    }
  },
};
