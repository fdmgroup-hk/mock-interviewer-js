import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

const LINE_Y_BUCKET_PX = 2
const SPACE_GAP_FACTOR = 0.6
const MIN_COLUMN_LINES = 4

function toItemPosition(item) {
    const transform = Array.isArray(item?.transform) ? item.transform : []
    const x = Number(transform[4] || 0)
    const y = Number(transform[5] || 0)
    const width = Number(item?.width || 0)
    return {
        text: String(item?.str || ''),
        x,
        y,
        width,
    }
}

function groupItemsByVisualLine(items = []) {
    const buckets = new Map()

    for (const rawItem of items) {
        const item = toItemPosition(rawItem)
        if (!item.text.trim()) continue

        const yBucket = Math.round(item.y / LINE_Y_BUCKET_PX) * LINE_Y_BUCKET_PX
        if (!buckets.has(yBucket)) {
            buckets.set(yBucket, [])
        }
        buckets.get(yBucket).push(item)
    }

    return Array.from(buckets.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([, lineItems]) => lineItems.sort((a, b) => a.x - b.x))
}

function buildVisualLineRecords(items = []) {
    return groupItemsByVisualLine(items)
        .map((lineItems) => {
            const text = joinLineItems(lineItems)
            if (!text) return null

            const first = lineItems[0]
            const last = lineItems[lineItems.length - 1]
            return {
                y: Number(first?.y || 0),
                minX: Number(first?.x || 0),
                maxX: Number(last?.x || 0) + Number(last?.width || 0),
                centerX: (Number(first?.x || 0) + Number(last?.x || 0) + Number(last?.width || 0)) / 2,
                text,
            }
        })
        .filter(Boolean)
}

function detectColumnSplitX(lines = [], pageWidth = 0) {
    if (lines.length < MIN_COLUMN_LINES * 2) return null

    const starts = lines
        .map((line) => line.minX)
        .filter((value) => Number.isFinite(value))
        .sort((a, b) => a - b)

    if (starts.length < MIN_COLUMN_LINES * 2) return null

    let largestGap = 0
    let gapMidpoint = 0

    for (let index = 1; index < starts.length; index += 1) {
        const gap = starts[index] - starts[index - 1]
        if (gap > largestGap) {
            largestGap = gap
            gapMidpoint = (starts[index] + starts[index - 1]) / 2
        }
    }

    const minimumGap = Math.max(80, Number(pageWidth || 0) * 0.12)
    if (largestGap < minimumGap) return null

    const leftLines = lines.filter((line) => line.centerX <= gapMidpoint)
    const rightLines = lines.filter((line) => line.centerX > gapMidpoint)

    if (leftLines.length < MIN_COLUMN_LINES || rightLines.length < MIN_COLUMN_LINES) {
        return null
    }

    return gapMidpoint
}

function linesToPageText(lines = [], pageWidth = 0) {
    if (!lines.length) return ''

    const splitX = detectColumnSplitX(lines, pageWidth)
    if (!splitX) {
        return lines
            .sort((a, b) => b.y - a.y)
            .map((line) => line.text)
            .filter(Boolean)
            .join('\n')
    }

    const leftColumnLines = lines
        .filter((line) => line.centerX <= splitX)
        .sort((a, b) => b.y - a.y)
        .map((line) => line.text)
        .filter(Boolean)

    const rightColumnLines = lines
        .filter((line) => line.centerX > splitX)
        .sort((a, b) => b.y - a.y)
        .map((line) => line.text)
        .filter(Boolean)

    return [...leftColumnLines, '', ...rightColumnLines].join('\n').trim()
}

function joinLineItems(lineItems = []) {
    if (!lineItems.length) return ''

    let line = ''
    let previous = null

    for (const item of lineItems) {
        const text = item.text.trim()
        if (!text) continue

        if (!line) {
            line = text
            previous = item
            continue
        }

        const averageCharWidth = previous && previous.text.length
            ? previous.width / previous.text.length
            : 4
        const previousEndX = previous.x + previous.width
        const gap = item.x - previousEndX
        const needsSpace = gap > Math.max(2, averageCharWidth * SPACE_GAP_FACTOR)

        line += needsSpace ? ` ${text}` : text
        previous = item
    }

    return line.trim()
}

function normalizeMultilineText(value = '') {
    return String(value || '')
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

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

export async function extractLinePreservedTextFromPdfFile(file) {
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })

    try {
        const pdf = await loadingTask.promise
        const pageTexts = []

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber)
            const textContent = await page.getTextContent()
            const lineRecords = buildVisualLineRecords(textContent.items)
            const pageWidth = page.getViewport({ scale: 1 }).width
            const pageText = linesToPageText(lineRecords, pageWidth)

            if (pageText.trim()) {
                pageTexts.push(pageText)
            }
        }

        return normalizeMultilineText(pageTexts.join('\n\n'))
    } finally {
        loadingTask.destroy()
    }
}
