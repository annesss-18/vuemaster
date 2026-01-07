// lib/server-utils.ts (REFACTORED - Using canvas-based approach without pdf-parse)
import * as cheerio from 'cheerio';
import { URL } from 'url';

const MAX_RESUME_SIZE_MB = 5;
const MAX_TEXT_LENGTH = 50000;

const BLOCKED_HOSTS = [
  '127.0.0.1', 'localhost', '0.0.0.0',
  '169.254.169.254',
  '::1',
  'metadata.google.internal',
];

const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^fc00:/,
  /^fe80:/,
];

function isPrivateOrLocalhost(hostname: string): boolean {
  if (BLOCKED_HOSTS.includes(hostname.toLowerCase())) {
    return true;
  }
  return PRIVATE_IP_RANGES.some(regex => regex.test(hostname));
}

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Extract text from PDF using a simple regex-based approach
 * This is more reliable than heavy PDF libraries in serverless environments
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Convert buffer to string to extract text
    const pdfText = buffer.toString('latin1');
    
    // Check if it's a valid PDF
    if (!pdfText.startsWith('%PDF')) {
      throw new Error('Invalid PDF file format');
    }

    // Extract text content using regex patterns
    // This extracts text between BT (Begin Text) and ET (End Text) markers
    const textMatches = pdfText.match(/\(([^)]+)\)/g);
    
    if (!textMatches || textMatches.length === 0) {
      // Try alternative pattern for encoded text
      const altMatches = pdfText.match(/\/F\d+\s+\d+\s+Tf\s*\(([^)]*)\)/g);
      
      if (!altMatches || altMatches.length === 0) {
        throw new Error('No extractable text found in PDF. The PDF may be image-based or encrypted.');
      }
      
      const text = altMatches
        .map(match => {
          const textMatch = match.match(/\(([^)]*)\)/);
          return textMatch ? textMatch[1] : '';
        })
        .join(' ')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\')
        .trim();
        
      return text;
    }

    // Extract and clean text
    const extractedText = textMatches
      .map(match => match.replace(/^\(|\)$/g, ''))
      .join(' ')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\')
      .replace(/\s+/g, ' ')
      .trim();

    if (!extractedText || extractedText.length < 10) {
      throw new Error('PDF appears to be empty or contains no extractable text. It may be an image-based PDF.');
    }

    return extractedText;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to extract text from PDF. Please try a different file or convert it to text format.');
  }
}

/**
 * Extract text from DOCX file
 * DOCX is essentially a ZIP file containing XML
 */
async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    // For DOCX, we'll convert to string and extract text from XML
    const content = buffer.toString('utf-8');
    
    // DOCX files contain text in <w:t> tags
    const textMatches = content.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
    
    if (!textMatches || textMatches.length === 0) {
      throw new Error('No text found in DOCX file. The file may be corrupted.');
    }

    const extractedText = textMatches
      .map(match => {
        const textContent = match.match(/>([^<]+)</);
        return textContent ? textContent[1] : '';
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!extractedText || extractedText.length < 10) {
      throw new Error('DOCX file appears to be empty or contains no extractable text.');
    }

    return extractedText;
  } catch (error) {
    // If DOCX parsing fails, return helpful error
    throw new Error('Failed to extract text from DOCX. Please save the file as PDF or plain text instead.');
  }
}

export async function extractTextFromFile(file: File, maxSizeMB: number = MAX_RESUME_SIZE_MB): Promise<string> {
  const maxSize = maxSizeMB * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(`File size exceeds ${maxSizeMB}MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Handle PDF files
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const pdfMagic = buffer.slice(0, 4).toString();
      if (!pdfMagic.startsWith('%PDF')) {
        throw new Error('File is not a valid PDF. Please upload a genuine PDF file.');
      }

      const text = await extractTextFromPDF(buffer);

      if (text.length > MAX_TEXT_LENGTH) {
        return text.slice(0, MAX_TEXT_LENGTH) + '\n\n... (content truncated due to length)';
      }

      return text;
    }

    // Handle DOCX files
    if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.toLowerCase().endsWith('.docx')
    ) {
      const text = await extractTextFromDOCX(buffer);

      if (text.length > MAX_TEXT_LENGTH) {
        return text.slice(0, MAX_TEXT_LENGTH) + '\n\n... (content truncated due to length)';
      }

      return text;
    }

    // Handle plain text files
    const text = buffer.toString('utf-8');
    
    if (text.length > MAX_TEXT_LENGTH) {
      return text.slice(0, MAX_TEXT_LENGTH) + '\n\n... (content truncated due to length)';
    }

    if (!text.trim()) {
      throw new Error('File appears to be empty.');
    }

    return text;
  } catch (error) {
    console.error("Error parsing file:", error);

    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to extract text from file. Please try a different file or save it as plain text.");
  }
}

export async function extractTextFromUrl(url: string): Promise<string> {
  try {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error('Invalid URL format. Please provide a valid HTTP or HTTPS URL.');
    }

    if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
      throw new Error('Only HTTP and HTTPS URLs are allowed.');
    }

    if (isPrivateOrLocalhost(parsedUrl.hostname)) {
      throw new Error('Access to private networks and localhost is not allowed.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

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

    if (html.length > 500000) {
      throw new Error('Page is too large to process (max 500KB).');
    }

    const $ = cheerio.load(html);

    $('script').remove();
    $('style').remove();
    $('nav').remove();
    $('footer').remove();
    $('header').remove();

    const text = $('body').text().replace(/\s\s+/g, ' ').trim();

    if (!text) {
      throw new Error('No content could be extracted from the URL.');
    }

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