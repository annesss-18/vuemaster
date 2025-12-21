import * as cheerio from 'cheerio';
import { URL } from 'url';

const MAX_RESUME_SIZE_MB = 5;
const MAX_JD_SIZE_MB = 10;
const PDF_PARSE_TIMEOUT_MS = 30000; // 30 seconds
const MAX_TEXT_LENGTH = 50000;

// SSRF Protection: Block private IPs and metadata endpoints
const BLOCKED_HOSTS = [
  '127.0.0.1', 'localhost', '0.0.0.0',
  '169.254.169.254', // AWS/GCP metadata
  '::1', // IPv6 localhost
  'metadata.google.internal', // GCP metadata
];

const PRIVATE_IP_RANGES = [
  /^10\./,                          // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12
  /^192\.168\./,                     // 192.168.0.0/16
  /^fc00:/,                          // IPv6 private
  /^fe80:/,                          // IPv6 link-local
];

function isPrivateOrLocalhost(hostname: string): boolean {
  // Check exact matches first
  if (BLOCKED_HOSTS.includes(hostname.toLowerCase())) {
    return true;
  }

  // Check private IP ranges
  return PRIVATE_IP_RANGES.some(regex => regex.test(hostname));
}

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

export async function extractTextFromFile(file: File, maxSizeMB: number = MAX_RESUME_SIZE_MB): Promise<string> {
  // Validate file size
  const maxSize = maxSizeMB * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(`File size exceeds ${maxSizeMB}MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (file.type === 'application/pdf') {
      // Verify PDF magic number
      const pdfMagic = buffer.slice(0, 4).toString();
      if (!pdfMagic.startsWith('%PDF')) {
        throw new Error('File is not a valid PDF. Please upload a genuine PDF file.');
      }

      // Dynamic import with timeout for PDF parsing
      const pdfModule = await import('pdf-parse') as { default?: (buf: Buffer) => Promise<{ text?: string }>; parse?: (buf: Buffer) => Promise<{ text?: string }> };
      const pdfFn = pdfModule.default ?? pdfModule.parse;

      if (typeof pdfFn === 'function') {
        // Add timeout to prevent hanging on corrupted PDFs
        const parsePromise = pdfFn(buffer);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('PDF parsing timeout. The file may be corrupted.')), PDF_PARSE_TIMEOUT_MS)
        );

        const data = await Promise.race([parsePromise, timeoutPromise]);
        const text = data?.text ?? '';

        // Limit text length
        if (text.length > MAX_TEXT_LENGTH) {
          return text.slice(0, MAX_TEXT_LENGTH) + '\n\n... (content truncated due to length)';
        }

        if (!text.trim()) {
          throw new Error('PDF appears to be empty or contains no extractable text.');
        }

        return text;
      }
      throw new Error('PDF parser not available. Please try again.');
    }

    // Handle text files
    const text = buffer.toString('utf-8');
    if (text.length > MAX_TEXT_LENGTH) {
      throw new Error(`Text file too large (max ${MAX_TEXT_LENGTH} characters).`);
    }

    if (!text.trim()) {
      throw new Error('File appears to be empty.');
    }

    return text;
  } catch (error) {
    console.error("Error parsing file:", error);

    // Re-throw with original message if it's already a custom error
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to extract text from file. Please try a different file.");
  }
}

export async function extractTextFromUrl(url: string): Promise<string> {
  try {
    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (err) {
      throw new Error('Invalid URL format. Please provide a valid HTTP or HTTPS URL.');
    }

    // Only allow HTTP/HTTPS protocols
    if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
      throw new Error('Only HTTP and HTTPS URLs are allowed.');
    }

    // Block private IPs, localhost, and metadata endpoints
    if (isPrivateOrLocalhost(parsedUrl.hostname)) {
      throw new Error('Access to private networks and localhost is not allowed.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VueMaster/1.0; +https://vuemaster.app)'
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // Limit HTML size
    if (html.length > 500000) { // 500KB
      throw new Error('Page is too large to process (max 500KB).');
    }

    const $ = cheerio.load(html);

    // Remove scripts, styles, and irrelevant tags
    $('script').remove();
    $('style').remove();
    $('nav').remove();
    $('footer').remove();
    $('header').remove();

    const text = $('body').text().replace(/\s\s+/g, ' ').trim();

    if (!text) {
      throw new Error('No content could be extracted from the URL.');
    }

    // Limit extracted text
    if (text.length > 20000) {
      return text.slice(0, 20000) + '\n\n... (content truncated)';
    }

    return text;
  } catch (error) {
    console.error("Error scraping URL:", error);

    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
      throw new Error('URL request timed out (max 10 seconds). The page may be slow or unreachable.');
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Failed to extract text from URL. Please check the URL and try again.");
  }
}