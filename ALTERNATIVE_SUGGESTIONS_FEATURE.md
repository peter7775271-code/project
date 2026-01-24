# Alternative Suggestions Feature

## Overview
When a product analysis scores below 50/100, the AI now automatically suggests a healthier alternative with a full nutritional analysis of the recommended product.

## Implementation Details

### 1. Backend API Enhancement (`/src/app/api/nutrition/analyze/route.ts`)

**Changes:**
- Added `alternativeSuggestion` field to the `NutritionAnalysis` interface
- Implemented conditional logic that triggers when `healthScore < 50`
- Makes a second OpenAI API call to generate an alternative product suggestion
- Parses the alternative analysis and includes it in the response
- Saves the alternative suggestion to the database in the `nutrition_info` JSONB field

**Structure:**
```typescript
alternativeSuggestion?: {
  productName: string;
  reason: string;        // Why this is better (1-2 sentences)
  healthScore: number;   // Health rating of alternative (0-100)
  ingredients: [...];    // Full ingredient breakdown
  macronutrients: {...}; // Nutritional values
  summary: string;       // Health assessment
}
```

**Key Features:**
- ✅ Only triggers for products scoring below 50
- ✅ Uses same comprehensive analysis framework as original product
- ✅ Gracefully continues if alternative generation fails
- ✅ Includes detailed reasoning for why alternative is better
- ✅ Shows score improvement (+X points better)

### 2. Frontend Type Updates (`/src/app/dashboard/page.tsx`)

**Updated `NutritionEntry` Interface:**
- Added `alternativeSuggestion` optional field to `nutrition_info` type definition
- Matches the API response structure exactly
- Enables TypeScript type safety for frontend components

### 3. UI Components

#### A. NutritionView - Current Analysis Section
**Location:** Lines 1025-1047

**Features:**
- 🎨 Green gradient background with "💡 Healthier Alternative" heading
- 📊 Health score display with color-coded progress bar
- 📈 Score improvement indicator (+X points better)
- 🥗 Macronutrient breakdown grid
- 📋 Key ingredients display (top 5 with health ratings)
- 📝 Summary assessment

#### B. HistoryDetailModal - Historical Analysis View
**Location:** Lines 817-902

**Features:**
- Same comprehensive display as NutritionView
- Shows stored alternative suggestion from database
- Maintains layout consistency with original analysis
- Enables users to review past alternative suggestions

## User Flow

1. **User submits product analysis**
   - Either by image upload or product name

2. **AI analyzes the product**
   - Generates health score, ingredients, macronutrients, summary

3. **Check health score**
   - If score < 50 → Trigger alternative suggestion
   - If score >= 50 → Skip (no alternative needed)

4. **Generate alternative**
   - AI suggests healthier product in same category
   - Analyzes the alternative comprehensively
   - Calculates score improvement

5. **Display results**
   - Show original analysis
   - Below that, show alternative suggestion with reasoning
   - Highlight the score improvement

6. **Save to database**
   - Store both original and alternative in nutrition_info JSONB
   - Future lookups retrieve both for comparison

## Example Scenarios

### Scenario 1: Sugary Soft Drink
- **Product:** Coca Cola (Health Score: ~15)
- **Alternative:** Suggested: Sparkling Water with Natural Flavor
- **Reason:** No added sugars, no artificial ingredients, hydrating
- **Alternative Score:** ~85
- **Improvement:** +70 points

### Scenario 2: Processed Snack
- **Product:** Cheetos (Health Score: ~20)
- **Alternative:** Suggested: Roasted Almonds
- **Reason:** Whole food source of protein, healthy fats, fiber
- **Alternative Score:** ~80
- **Improvement:** +60 points

### Scenario 3: High-Quality Product
- **Product:** Greek Yogurt (Health Score: 78)
- **Alternative:** None shown (above 50 threshold)

## Database Impact

The feature leverages existing infrastructure:
- ✅ Uses existing `nutrition_entries` table
- ✅ Stores alternative in `nutrition_info` JSONB column
- ✅ No schema migration needed
- ✅ Backward compatible (old entries without alternatives still work)

## API Behavior

**Request:**
```json
POST /api/nutrition/analyze
{
  "productName": "Coca Cola" or
  "productImage": "data:image/png;base64,..."
}
```

**Response (with alternative):**
```json
{
  "success": true,
  "analysis": {
    "healthScore": 15,
    "productName": "Coca Cola",
    "ingredients": [...],
    "macronutrients": {...},
    "summary": "...",
    "recommendations": [...],
    "alternativeSuggestion": {
      "productName": "Sparkling Water",
      "reason": "...",
      "healthScore": 85,
      "ingredients": [...],
      "macronutrients": {...},
      "summary": "..."
    }
  },
  "saved": true
}
```

## Performance Considerations

- ⚡ Alternative generation only triggers for low-scoring products (~< 50)
- ⚡ Uses parallel API calls (second call made after first response parsing)
- ⚡ Graceful degradation: continues even if alternative generation fails
- ⚡ Database saves both analyses in single JSONB field (efficient storage)

## Testing Checklist

- ✅ Type errors resolved (NutritionEntry interface updated)
- ✅ API endpoint compiles without errors
- ✅ Build successful with no TypeScript errors
- ✅ Frontend components render with proper types
- ✅ Alternative displayed in current analysis view
- ✅ Alternative displayed in history detail modal
- ✅ Score improvement calculation shows correctly
- ✅ Alternative hides for products scoring >= 50

## Future Enhancements

Possible improvements:
1. Allow users to mark alternatives as helpful/not helpful
2. Learn from user preferences to improve suggestions
3. Multiple alternative suggestions instead of just one
4. Category-specific alternatives (e.g., "If you like soda, try...")
5. Alternative price comparison integration
6. Availability/store locator for suggested products
