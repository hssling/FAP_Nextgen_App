import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

const MAX_TEXT_LENGTH = 12000;
const OCR_LANGUAGES = 'eng+hin+kan';
const PDF_TIMEOUT_MS = 45000;
const DOCX_TIMEOUT_MS = 30000;
const OCR_TIMEOUT_MS = 90000;

const createExtractorError = (code, message, cause) => {
    const error = new Error(message);
    error.code = code;
    if (cause) error.cause = cause;
    return error;
};

const withTimeout = async (promise, timeoutMs, timeoutMessage, timeoutCode) => {
    let timeoutId;
    try {
        return await Promise.race([
            promise,
            new Promise((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(createExtractorError(timeoutCode, timeoutMessage));
                }, timeoutMs);
            })
        ]);
    } finally {
        clearTimeout(timeoutId);
    }
};

const normalizeText = (value) => {
    const text = (value || '')
        .split('\0').join(' ')
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .normalize('NFC');
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
    const arrayBuffer = await withTimeout(
        file.arrayBuffer(),
        DOCX_TIMEOUT_MS,
        'DOCX parsing timed out. Try a smaller document or convert to PDF.',
        'DOCX_TIMEOUT'
    );
    const result = await withTimeout(
        mammoth.extractRawText({ arrayBuffer }),
        DOCX_TIMEOUT_MS,
        'DOCX text extraction timed out.',
        'DOCX_TIMEOUT'
    );
    return normalizeText(result?.value || '');
};

const extractFromPdf = async (file) => {
    const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

    const buffer = await withTimeout(
        file.arrayBuffer(),
        PDF_TIMEOUT_MS,
        'PDF read timed out. Try a smaller PDF or stable network/device state.',
        'PDF_TIMEOUT'
    );
    const loadingTask = pdfjs.getDocument({ data: buffer });
    const pdf = await withTimeout(
        loadingTask.promise,
        PDF_TIMEOUT_MS,
        'PDF loading timed out.',
        'PDF_TIMEOUT'
    );
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        const page = await withTimeout(
            pdf.getPage(pageNum),
            PDF_TIMEOUT_MS,
            `PDF page ${pageNum} loading timed out.`,
            'PDF_TIMEOUT'
        );
        const content = await withTimeout(
            page.getTextContent(),
            PDF_TIMEOUT_MS,
            `PDF page ${pageNum} text extraction timed out.`,
            'PDF_TIMEOUT'
        );
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
    const worker = await withTimeout(
        createWorker(OCR_LANGUAGES),
        OCR_TIMEOUT_MS,
        'OCR initialization timed out.',
        'OCR_TIMEOUT'
    );
    try {
        const result = await withTimeout(
            worker.recognize(file),
            OCR_TIMEOUT_MS,
            'OCR processing timed out. Try a clearer image or smaller file.',
            'OCR_TIMEOUT'
        );
        const parsed = normalizeText(result?.data?.text || '');
        if (parsed) return parsed;
    } finally {
        await worker.terminate();
    }

    // Fallback to English-only if multilingual model yields no usable text.
    const fallbackWorker = await withTimeout(
        createWorker('eng'),
        OCR_TIMEOUT_MS,
        'Fallback OCR initialization timed out.',
        'OCR_TIMEOUT'
    );
    try {
        const fallback = await withTimeout(
            fallbackWorker.recognize(file),
            OCR_TIMEOUT_MS,
            'Fallback OCR processing timed out.',
            'OCR_TIMEOUT'
        );
        return normalizeText(fallback?.data?.text || '');
    } finally {
        await fallbackWorker.terminate();
    }
};

export const extractDocumentText = async (file) => {
    if (!file) throw new Error('No file selected');

    const ext = extensionOf(file.name);
    const mime = (file.type || '').toLowerCase();

    try {
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
            throw createExtractorError('UNSUPPORTED_DOC', 'Legacy .doc parsing is not supported in-browser. Please convert to DOCX or PDF.');
        }

        return extractFromTextLikeFile(file);
    } catch (error) {
        if (error?.code) throw error;
        throw createExtractorError('PARSE_FAILED', error?.message || 'Document parsing failed.', error);
    }
};
