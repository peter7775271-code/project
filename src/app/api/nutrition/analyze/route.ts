import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface NutritionAnalysis {
  healthScore: number; // 0-100
  productName: string;
  ingredients: {
    name: string;
    healthRating: 'excellent' | 'good' | 'moderate' | 'poor' | 'avoid';
    reason: string;
  }[];
  macronutrients: {
    protein?: string;
    carbs?: string;
    fat?: string;
    fiber?: string;
    sugar?: string;
    sodium?: string;
  };
  summary: string;
  recommendations: string[];
  alternativeSuggestion?: {
    productName: string;
    reason: string;
    healthScore: number;
    ingredients: {
      name: string;
      healthRating: 'excellent' | 'good' | 'moderate' | 'poor' | 'avoid';
      reason: string;
    }[];
    macronutrients: {
      protein?: string;
      carbs?: string;
      fat?: string;
      fiber?: string;
      sugar?: string;
      sodium?: string;
    };
    summary: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    let { productImage, productName, productUrl } = await request.json();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    // Verify user is authenticated
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // If URL provided, scrape it first
    if (productUrl) {
      try {
        console.log('[ANALYZE API] Scraping URL:', productUrl);
        
        // Get the origin - in Vercel and local, request.nextUrl.origin should work
        let origin = request.nextUrl.origin;
        
        // Fallback: if origin contains 'localhost', ensure proper format
        if (!origin || origin === 'http://undefined') {
          // Try to construct from request headers
          const host = request.headers.get('host');
          const proto = request.headers.get('x-forwarded-proto') || 'https';
          if (host) {
            origin = `${proto}://${host}`;
          } else {
            origin = 'http://localhost:3000'; // Fallback for development
          }
        }
        
        const scrapeUrl = new URL('/api/nutrition/scrape', origin).toString();
        console.log('[ANALYZE API] Scrape endpoint URL:', scrapeUrl);
        console.log('[ANALYZE API] Request origin:', origin);
        
        const scrapeResponse = await fetch(scrapeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: productUrl }),
        });

        console.log('[ANALYZE API] Scrape response status:', scrapeResponse.status);

        if (!scrapeResponse.ok) {
          let errorMessage = 'Failed to scrape URL';
          try {
            const errorData = await scrapeResponse.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // If response isn't JSON, use generic error
            const text = await scrapeResponse.text();
            console.error('[ANALYZE API] Scrape error response:', text.substring(0, 200));
          }
          return NextResponse.json(
            { error: errorMessage },
            { status: 400 }
          );
        }

        const scrapedData = await scrapeResponse.json();
        productImage = scrapedData.productImage;
        productName = scrapedData.productName;
        console.log('[ANALYZE API] Successfully scraped:', productName);
      } catch (error: any) {
        console.error('[ANALYZE API] Scraping error:', error);
        return NextResponse.json(
          { error: 'Failed to process URL: ' + (error.message || 'Unknown error') },
          { status: 400 }
        );
      }
    }

    // Validate input
    if (!productImage && !productName) {
      return NextResponse.json(
        { error: 'Either productImage, productName, or productUrl is required' },
        { status: 400 }
      );
    }

    // Build the message content
    let userMessageContent: any[] = [];

    if (productImage && productImage.startsWith('data:image')) {
      // Add image for analysis
      userMessageContent.push({
        type: 'image_url',
        image_url: {
          url: productImage,
        },
      });
      userMessageContent.push({
        type: 'text',
        text: 'Analyze this product image. Extract nutritional information and ingredients visible on the label. Provide a comprehensive health analysis.',
      });
    } else if (productName) {
      userMessageContent.push({
        type: 'text',
        text: `Analyze the nutritional profile and ingredients of: ${productName}. Provide information about its health impact based on typical nutritional data for this product.`,
      });
    }

    // Call OpenAI to analyze nutrition
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a nutritionist AI assistant. Analyze products and provide health ratings. 
          
Respond with ONLY valid JSON (no markdown, no code blocks) in this exact structure:
{
  "healthScore": <number 0-100>,
  "productName": "<string>",
  "ingredients": [
    {
      "name": "<ingredient name>",
      "healthRating": "<excellent|good|moderate|poor|avoid>",
      "reason": "<brief explanation>"
    }
  ],
  "macronutrients": {
    "protein": "<amount or 'unknown'>",
    "carbs": "<amount or 'unknown'>",
    "fat": "<amount or 'unknown'>",
    "fiber": "<amount or 'unknown'>",
    "sugar": "<amount or 'unknown'>",
    "sodium": "<amount or 'unknown'>"
  },
  "summary": "<2-3 sentence health assessment>",
  "recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"]
}

Scoring guide:
- 80-100: Excellent nutrition, whole foods, minimal processing
- 60-79: Good nutrition, some processed ingredients but balanced
- 40-59: Moderate, mixed healthy and unhealthy ingredients
- 20-39: Poor, high sugar/salt/bad fats, minimal nutrition
- 0-19: Avoid, ultra-processed, high harmful ingredients

Ingredients health ratings:
- excellent: Whole foods, high nutritional value (oats, spinach, salmon, berries, etc.)
- good: Beneficial with some processing (whole wheat, olive oil, yogurt, etc.)
- moderate: Acceptable but not optimal (refined flour, natural flavors, etc.)
- poor: Unhealthy but not extreme (high fructose corn syrup, trans fats, etc.)
- avoid: Known health risks (artificial trans fats, excessive sodium, banned additives, etc.)`,
        },
        {
          role: 'user',
          content: userMessageContent as any,
        },
      ],
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let analysis: NutritionAnalysis;
    try {
      analysis = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse OpenAI response:', responseText);
      throw new Error('Invalid response format from AI');
    }

    // If health score is below 50, get an alternative suggestion
    if (analysis.healthScore < 50) {
      try {
        const alternativeCompletion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a nutritionist AI. Suggest a healthier alternative to a product.
              
Respond with ONLY valid JSON (no markdown, no code blocks) in this exact structure:
{
  "productName": "<healthier alternative product name>",
  "reason": "<brief explanation why this is better (1-2 sentences)>",
  "healthScore": <number 0-100>,
  "ingredients": [
    {
      "name": "<ingredient name>",
      "healthRating": "<excellent|good|moderate|poor|avoid>",
      "reason": "<brief explanation>"
    }
  ],
  "macronutrients": {
    "protein": "<amount or 'unknown'>",
    "carbs": "<amount or 'unknown'>",
    "fat": "<amount or 'unknown'>",
    "fiber": "<amount or 'unknown'>",
    "sugar": "<amount or 'unknown'>",
    "sodium": "<amount or 'unknown'>"
  },
  "summary": "<2-3 sentence health assessment>"
}`,
            },
            {
              role: 'user',
              content: `The product "${analysis.productName}" has a health score of ${analysis.healthScore}/100. Suggest a healthier alternative that serves the same purpose or category.`,
            },
          ],
        });

        const alternativeText = alternativeCompletion.choices[0].message.content;
        if (alternativeText) {
          try {
            analysis.alternativeSuggestion = JSON.parse(alternativeText);
          } catch (e) {
            console.error('Failed to parse alternative suggestion:', alternativeText);
          }
        }
      } catch (error) {
        console.error('Error getting alternative suggestion:', error);
        // Continue without alternative suggestion if it fails
      }
    }

    // Save to database
    const { data, error } = await supabaseAdmin
      .from('nutrition_entries')
      .insert([
        {
          user_id: decoded.userId,
          product_name: analysis.productName,
          image_data: productImage || null,
          nutrition_info: {
            macronutrients: analysis.macronutrients,
            summary: analysis.summary,
            ...(analysis.alternativeSuggestion && { alternativeSuggestion: analysis.alternativeSuggestion }),
          },
          health_score: analysis.healthScore,
          ingredients_breakdown: analysis.ingredients,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error('Save nutrition error:', error);
      // Still return the analysis even if save fails
    }

    return NextResponse.json({
      success: true,
      analysis,
      saved: !error,
    });
  } catch (error: any) {
    console.error('Nutrition analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Error analyzing product' },
      { status: 500 }
    );
  }
}
