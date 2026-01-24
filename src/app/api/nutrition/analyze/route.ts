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
}

export async function POST(request: NextRequest) {
  try {
    const { productImage, productName } = await request.json();
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

    // Validate input
    if (!productImage && !productName) {
      return NextResponse.json(
        { error: 'Either productImage or productName is required' },
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
