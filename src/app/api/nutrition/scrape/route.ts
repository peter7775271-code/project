import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import sharp from 'sharp';

async function scrapeHTML(url: string) {
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(html);

    // Try to extract product name from common selectors
    let productName =
      $('h1').first().text().trim() ||
      $('[data-component-type="s-search-result"] h2').first().text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      $('title').text().trim();

    // Try to extract product image
    let imageUrl =
      $('img[alt*="product" i]').first().attr('src') ||
      $('img[alt*="Product" i]').first().attr('src') ||
      $('meta[property="og:image"]').attr('content') ||
      $('img').first().attr('src');

    // Remove query parameters and convert to absolute URL
    if (imageUrl && !imageUrl.startsWith('http')) {
      try {
        imageUrl = new URL(imageUrl, url).href;
      } catch {
        imageUrl = undefined;
      }
    }

    // Download and convert image to base64
    let base64Image: string | undefined;
    if (imageUrl) {
      try {
        const imageResponse = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        // Try to optimize image (converts AVIF, HEIC, and other formats to JPEG)
        try {
          const optimized = await sharp(imageResponse.data)
            .toFormat('jpeg')
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();

          base64Image = `data:image/jpeg;base64,${optimized.toString('base64')}`;
        } catch {
          // If optimization fails, use original
          base64Image = `data:image/jpeg;base64,${Buffer.from(imageResponse.data).toString('base64')}`;
        }
      } catch (error) {
        console.error('Error downloading image:', error);
      }
    }

    // Clean up product name
    productName = productName
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200);

    if (!productName && !base64Image) {
      throw new Error('Could not extract product information from URL');
    }

    return {
      productName: productName || 'Product from URL',
      productImage: base64Image,
      source: 'html-scrape',
    };
  } catch (error) {
    console.error('HTML scraping failed:', error);
    throw error;
  }
}

async function screenshotFallback(url: string) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

    // Extract title
    const productName = await page.title();

    // Take screenshot
    const screenshot = await page.screenshot({ type: 'jpeg', quality: 80 });
    const base64Image = `data:image/jpeg;base64,${(screenshot as Buffer).toString('base64')}`;

    await browser.close();

    return {
      productName: productName || 'Product from URL',
      productImage: base64Image,
      source: 'screenshot',
    };
  } catch (error) {
    console.error('Screenshot fallback failed:', error);
    if (browser) await browser.close();
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || !url.startsWith('http')) {
      return NextResponse.json(
        { error: 'Valid URL required' },
        { status: 400 }
      );
    }

    console.log('[SCRAPE API] Processing URL:', url);

    // Try HTML scraping first (fast)
    try {
      const result = await scrapeHTML(url);
      console.log('[SCRAPE API] HTML scrape successful');
      return NextResponse.json(result);
    } catch (htmlError) {
      console.log('[SCRAPE API] HTML scrape failed, trying screenshot fallback:', htmlError);

      // Fall back to screenshot
      try {
        const result = await screenshotFallback(url);
        console.log('[SCRAPE API] Screenshot fallback successful');
        return NextResponse.json(result);
      } catch (screenshotError) {
        return NextResponse.json(
          { error: 'Could not extract product data from URL. Please try a different link or upload an image instead.' },
          { status: 400 }
        );
      }
    }
  } catch (error: any) {
    console.error('Scrape error:', error);
    return NextResponse.json(
      { error: error.message || 'Error processing URL' },
      { status: 500 }
    );
  }
}
