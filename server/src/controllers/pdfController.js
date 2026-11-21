import { generatePDF } from '../services/typstService.js'
import prisma from '../lib/prisma.js'

export async function generatePDFHandler(req, res) {
  try {
    const { content, settings = {} } = req.body

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required and must be a string' })
    }

    const pdfBuffer = await generatePDF(content, settings)

    try {
      await prisma.document.create({
        data: {
          title: settings.title || 'Untitled Document',
          content
        }
      })
    } catch (dbError) {
      console.error('Failed to save document to database:', dbError)
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="chat-to-pdf.pdf"')
    res.setHeader('Content-Length', pdfBuffer.length)
    
    res.send(pdfBuffer)
  } catch (error) {
    console.error('Error generating PDF:', error)
    res.status(500).json({ error: 'Failed to generate PDF', details: error.message })
  }
}