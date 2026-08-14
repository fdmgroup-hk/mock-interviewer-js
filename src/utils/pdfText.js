import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

export async function extractTextFromPdfFile(file) {
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })

    try {
        const pdf = await loadingTask.promise
        const pageTexts = []
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber)
            const textContent = await page.getTextContent()
            const pageText = textContent.items.map((item) => item.str || '').join(' ').trim()
            if (pageText) pageTexts.push(pageText)
        }
        return pageTexts.join('\n\n')
    } finally {
        loadingTask.destroy()
    }
}
