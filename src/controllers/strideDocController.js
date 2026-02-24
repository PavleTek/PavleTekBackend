const prisma = require('../lib/prisma');
const r2Service = require('../services/r2Service');
const pdfService = require('../services/pdfService');

/**
 * Generate a PDF on-demand from markdown content
 */
const generatePdf = async (req, res) => {
  try {
    const { markdownContent, colors, fontSize } = req.body;

    if (!markdownContent || !colors || !fontSize) {
      return res.status(400).json({ error: 'Markdown content, colors, and font size are required' });
    }

    const pdfBuffer = await pdfService.generatePdfFromMarkdown(markdownContent, colors, fontSize);

    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
};

/**
 * Get all Stride documents
 */
const getAllDocuments = async (req, res) => {
  try {
    const documents = await prisma.strideDocument.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true
          }
        }
      }
    });
    res.json({ data: documents });
  } catch (error) {
    console.error('Error getting Stride documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

/**
 * Create a new Stride document (DB record + R2 upload)
 */
const createDocument = async (req, res) => {
  try {
    const { name, markdownContent, colors, fontSize } = req.body;

    if (!name || !markdownContent || !colors || !fontSize) {
      return res.status(400).json({ error: 'Name, markdown content, colors, and font size are required' });
    }

    // 1. Create DB row first to get the ID
    const document = await prisma.strideDocument.create({
      data: {
        name,
        createdById: req.user.id,
      },
    });

    const docId = document.id;
    const sanitizedName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    // 2. Define R2 keys
    const mdKey = `strideDoc/${docId}/${sanitizedName}.md`;
    const pdfKey = `strideDoc/${docId}/${sanitizedName}.pdf`;

    // 3. Generate PDF and MD buffers
    const [pdfBuffer, mdBuffer] = await Promise.all([
      pdfService.generatePdfFromMarkdown(markdownContent, colors, fontSize),
      Buffer.from(markdownContent, 'utf-8')
    ]);

    console.log(`Saving document "${name}". MD size: ${(mdBuffer.length / 1024).toFixed(2)}KB, PDF size: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)}MB`);

    // 4. Upload to R2
    await Promise.all([
      r2Service.uploadFile(mdKey, mdBuffer, 'text/markdown'),
      r2Service.uploadFile(pdfKey, pdfBuffer, 'application/pdf')
    ]);

    // 5. Update DB row with keys and sizes
    const updatedDocument = await prisma.strideDocument.update({
      where: { id: docId },
      data: {
        mdR2Key: mdKey,
        pdfR2Key: pdfKey,
        mdFileSize: mdBuffer.length,
        pdfFileSize: pdfBuffer.length,
      },
    });

    res.status(201).json({ 
      message: 'Document saved successfully', 
      data: updatedDocument 
    });
  } catch (error) {
    console.error('Error creating Stride document:', error);
    res.status(500).json({ error: 'Failed to save document' });
  }
};

/**
 * Download a file (MD or PDF) from R2
 */
const downloadFile = async (req, res) => {
  try {
    const { id, type } = req.params;
    
    const document = await prisma.strideDocument.findUnique({
      where: { id: parseInt(id) }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    let key, contentType, extension;
    if (type === 'md') {
      key = document.mdR2Key;
      contentType = 'text/markdown';
      extension = 'md';
    } else if (type === 'pdf') {
      key = document.pdfR2Key;
      contentType = 'application/pdf';
      extension = 'pdf';
    } else {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    if (!key) {
      return res.status(404).json({ error: 'File not found in storage' });
    }

    const fileBuffer = await r2Service.getFile(key);
    const sanitizedName = document.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedName}.${extension}"`);
    res.send(fileBuffer);
  } catch (error) {
    console.error('Error downloading Stride document file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
};

/**
 * Delete a Stride document (DB record + R2 objects)
 */
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.strideDocument.findUnique({
      where: { id: parseInt(id) }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // 1. Delete from R2
    const keysToDelete = [];
    if (document.mdR2Key) keysToDelete.push(document.mdR2Key);
    if (document.pdfR2Key) keysToDelete.push(document.pdfR2Key);

    if (keysToDelete.length > 0) {
      await Promise.all(keysToDelete.map(key => r2Service.deleteFile(key)));
    }

    // 2. Delete from DB
    await prisma.strideDocument.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting Stride document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};

module.exports = {
  getAllDocuments,
  createDocument,
  downloadFile,
  deleteDocument,
  generatePdf
};
