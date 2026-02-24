const puppeteer = require('puppeteer');
const { marked } = require('marked');

/**
 * Generates a PDF from markdown content with specific styling
 * @param {string} markdownContent - The markdown text to convert
 * @param {object} colors - Color settings for the document
 * @param {string} fontSize - Base font size (e.g., '10pt')
 * @returns {Promise<Buffer>} - The generated PDF buffer
 */
async function generatePdfFromMarkdown(markdownContent, colors, fontSize) {
  const htmlContent = await marked.parse(markdownContent);

  const styledHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #ffffff;
        }
        .documenta-preview {
          width: 8.5in;
          min-height: 11in;
          margin: 0 auto;
          padding: 0.75in 1in;
          box-sizing: border-box;
          font-size: ${fontSize};
          line-height: 1.5;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        .documenta-preview * { max-width: 100%; box-sizing: border-box; }
        .documenta-preview h1 { color: ${colors.h1}; font-size: 1.75em; font-weight: 700; margin: 0.67em 0; border-bottom: 2px solid ${colors.h1}20; padding-bottom: 0.3em; }
        .documenta-preview h2 { color: ${colors.h2}; font-size: 1.35em; font-weight: 600; margin: 0.83em 0; border-bottom: 1px solid ${colors.h2}15; padding-bottom: 0.25em; }
        .documenta-preview h3 { color: ${colors.h3}; font-size: 1.15em; font-weight: 600; margin: 1em 0; }
        .documenta-preview h4, .documenta-preview h5, .documenta-preview h6 { color: ${colors.h3}; font-weight: 600; margin: 1em 0; }
        .documenta-preview p { color: ${colors.body}; line-height: 1.6; margin: 0.6em 0; }
        .documenta-preview li { color: ${colors.body}; line-height: 1.6; }
        .documenta-preview a { color: ${colors.link}; text-decoration: underline; }
        .documenta-preview code { background-color: ${colors.codeBg}; color: ${colors.codeText}; padding: 0.15em 0.35em; border-radius: 3px; font-size: 0.85em; font-family: 'Courier New', Courier, monospace; }
        .documenta-preview pre { background-color: ${colors.codeBg}; border-radius: 6px; padding: 0.8em; margin: 0.8em 0; border: 1px solid #e0e0e0; white-space: pre-wrap; word-break: break-all; overflow: hidden; }
        .documenta-preview pre code { background: none; padding: 0; color: ${colors.codeText}; white-space: pre-wrap; word-break: break-all; }
        .documenta-preview blockquote { border-left: 4px solid ${colors.h2}; padding-left: 1em; margin: 1em 0; color: ${colors.body}99; font-style: italic; }
        .documenta-preview table { border-collapse: collapse; width: 100%; margin: 0.8em 0; table-layout: fixed; }
        .documenta-preview th { background-color: ${colors.h1}10; color: ${colors.h2}; padding: 0.4em 0.6em; border: 1px solid #ddd; text-align: left; font-weight: 600; font-size: 0.9em; overflow: hidden; text-overflow: ellipsis; word-break: break-word; }
        .documenta-preview td { padding: 0.4em 0.6em; border: 1px solid #ddd; color: ${colors.body}; font-size: 0.9em; overflow: hidden; text-overflow: ellipsis; word-break: break-word; }
        .documenta-preview tr:nth-child(even) { background-color: #f9f9f9; }
        .documenta-preview img { max-width: 100%; height: auto; border-radius: 4px; }
        .documenta-preview hr { border: none; border-top: 2px solid #e0e0e0; margin: 1.5em 0; }
        .documenta-preview ul, .documenta-preview ol { padding-left: 1.5em; margin: 0.6em 0; }
        .documenta-preview strong { font-weight: 700; }
        .documenta-preview em { font-style: italic; }
      </style>
    </head>
    <body>
      <div class="documenta-preview">
        ${htmlContent}
      </div>
    </body>
    </html>
  `;

  let browser;
  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: 'new'
    });
    const page = await browser.newPage();
    await page.setContent(styledHtml, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0in',
        right: '0in',
        bottom: '0in',
        left: '0in'
      }
    });

    return pdfBuffer;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = {
  generatePdfFromMarkdown
};
