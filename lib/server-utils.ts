import * as cheerio from 'cheerio';

export async function extractTextFromFile(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    if (file.type === 'application/pdf') {
      const pdfModule = (await import('pdf-parse')) as any;
      const pdfFn = pdfModule?.default ?? pdfModule;
      const data = await pdfFn(buffer);
      return data?.text ?? '';
    }
    
    // Fallback for text files
    return buffer.toString('utf-8');
  } catch (error) {
    console.error("Error parsing file:", error);
    throw new Error("Failed to extract text from file");
  }
}

export async function extractTextFromUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Remove scripts, styles, and irrelevant tags
    $('script').remove();
    $('style').remove();
    $('nav').remove();
    $('footer').remove();
    
    return $('body').text().replace(/\s\s+/g, ' ').trim();
  } catch (error) {
    console.error("Error scraping URL:", error);
    throw new Error("Failed to extract text from URL");
  }
}