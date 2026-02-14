import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

const MAX_TEXT_LENGTH = 12000;
const OCR_LANGUAGES = 'eng+hin+kan';

const normalizeText = (value) => {
    const text = (value || '')
        .split('\0').join(' ')
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    return text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
};

const extensionOf = (filename = '') => {
    const idx = filename.lastIndexOf('.');
    if (idx < 0) return '';
    return filename.slice(idx + 1).toLowerCase();
};

const extractFromTextLikeFile = async (file) => {
    return normalizeText(await file.text());
};

const extractFromDocx = async (file) => {
    const mammoth = await import('mammoth/mammoth.browser.js');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return normalizeText(result?.value || '');
};

const extractFromPdf = async (file) => {
    const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

    const buffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const pageText = content.items
            .map((item) => item?.str || '')
            .join(' ')
            .trim();
        if (pageText) {
            fullText += `${pageText}\n\n`;
        }
    }

    return normalizeText(fullText);
};

const extractFromImageWithOcr = async (file) => {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker(OCR_LANGUAGES);
    try {
        const result = await worker.recognize(file);
        const parsed = normalizeText(result?.data?.text || '');
        if (parsed) return parsed;
    } finally {
        await worker.terminate();
    }

    // Fallback to English-only if multilingual model yields no usable text.
    const fallbackWorker = await createWorker('eng');
    try {
        const fallback = await fallbackWorker.recognize(file);
        return normalizeText(fallback?.data?.text || '');
    } finally {
        await fallbackWorker.terminate();
    }
};

export const extractDocumentText = async (file) => {
    if (!file) throw new Error('No file selected');

    const ext = extensionOf(file.name);
    const mime = (file.type || '').toLowerCase();

    if (mime.startsWith('text/') || ['txt', 'md', 'csv', 'json'].includes(ext)) {
        return extractFromTextLikeFile(file);
    }

    if (mime === 'application/pdf' || ext === 'pdf') {
        return extractFromPdf(file);
    }

    if (
        mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        ext === 'docx'
    ) {
        return extractFromDocx(file);
    }

    if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
        return extractFromImageWithOcr(file);
    }

    if (ext === 'doc') {
        throw new Error('Legacy .doc parsing is not supported in-browser. Please convert to DOCX or PDF.');
    }

    return extractFromTextLikeFile(file);
};
