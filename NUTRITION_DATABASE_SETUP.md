# Nutrition Analysis Database Setup

Your nutrition analysis feature now saves all product analyses to Supabase! Follow these steps to set up the database table.

## 🚀 Create the Nutrition Entries Table

Go to your Supabase dashboard and run this SQL in the **SQL Editor**:

```sql
-- Create nutrition_entries table
CREATE TABLE nutrition_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  image_data TEXT, -- Base64 encoded product image
  nutrition_info JSONB, -- Stores macronutrients and summary
  health_score INTEGER NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
  ingredients_breakdown JSONB, -- Array of ingredient objects with ratings
  created_at TIMESTAMP DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX idx_nutrition_user_id ON nutrition_entries(user_id);
CREATE INDEX idx_nutrition_created_at ON nutrition_entries(created_at);
CREATE INDEX idx_nutrition_user_created ON nutrition_entries(user_id, created_at);

-- Enable Row Level Security
ALTER TABLE nutrition_entries ENABLE ROW LEVEL SECURITY;

-- Allow users to see only their own entries
CREATE POLICY "Users can see their own nutrition entries" ON nutrition_entries
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own entries
CREATE POLICY "Users can insert their own nutrition entries" ON nutrition_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## ✨ Features

- ✅ **Product Analysis**: Upload product images or enter product names
- ✅ **Health Score**: AI-powered rating from 0-100 based on ingredients
- ✅ **Ingredient Breakdown**: Detailed analysis of each ingredient
- ✅ **Nutritional Info**: Macronutrients extraction and summary
- ✅ **History**: All analyses saved and retrievable
- ✅ **User-specific**: Each user only sees their own analyses
- ✅ **Timestamped**: Track when each analysis was created

## 📋 API Endpoints

### Analyze Product
```
POST /api/nutrition/analyze
Headers: Authorization: Bearer <token>
Body: { 
  "productImage": "data:image/png;base64,...", // or null
  "productName": "Coca Cola" // or null
}
Response: { 
  "success": true,
  "analysis": {
    "healthScore": 15,
    "productName": "Coca Cola",
    "ingredients": [...],
    "macronutrients": {...},
    "summary": "...",
    "recommendations": [...]
  }
}
```

### Load History
```
GET /api/nutrition/load
Headers: Authorization: Bearer <token>
Response: { 
  "entries": [
    {
      "id": "...",
      "product_name": "...",
      "health_score": 15,
      "created_at": "2026-01-24T...",
      "ingredients_breakdown": [...],
      "nutrition_info": {...}
    }
  ]
}
```

## 📊 Database Schema

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key, auto-generated |
| user_id | UUID | Links to users table, cascade delete |
| product_name | TEXT | Name of the analyzed product |
| image_data | TEXT | Base64-encoded product image (optional) |
| nutrition_info | JSONB | Macronutrients and summary |
| health_score | INTEGER | 0-100 rating |
| ingredients_breakdown | JSONB | Array of ingredient objects with health ratings |
| created_at | TIMESTAMP | Auto-generated creation time |

## Health Score Scale

- **80-100**: Excellent - Whole foods, minimal processing
- **60-79**: Good - Some processed but balanced
- **40-59**: Moderate - Mixed healthy and unhealthy
- **20-39**: Poor - High sugar/salt/bad fats
- **0-19**: Avoid - Ultra-processed, harmful ingredients

## 🔍 View Your Nutrition History

In Supabase:
1. Go to **Table Editor**
2. Click on **nutrition_entries**
3. See all your product analyses with health scores

You can also query with SQL:
```sql
SELECT product_name, health_score, created_at 
FROM nutrition_entries 
WHERE user_id = 'user-uuid-here' 
ORDER BY created_at DESC;
```

## 🚀 Don't Forget Vercel!

Deploy your changes to Vercel with the new API routes.
