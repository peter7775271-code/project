# ⚡ Quick Setup: Nutrition Feature

## 1️⃣ Create Database Table (1 minute)

Open Supabase Dashboard → SQL Editor → Copy & Run:

```sql
CREATE TABLE nutrition_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  image_data TEXT,
  nutrition_info JSONB,
  health_score INTEGER NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
  ingredients_breakdown JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_nutrition_user_id ON nutrition_entries(user_id);
CREATE INDEX idx_nutrition_created_at ON nutrition_entries(created_at);
CREATE INDEX idx_nutrition_user_created ON nutrition_entries(user_id, created_at);

ALTER TABLE nutrition_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own nutrition entries" ON nutrition_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own nutrition entries" ON nutrition_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## 2️⃣ Deploy Code

The feature is ready! Just push to GitHub:

```bash
git add .
git commit -m "Add nutrition analysis feature"
git push
```

## 3️⃣ Test It!

1. Go to your dashboard
2. Click **"Nutrition Analysis"** button
3. Upload a product image OR type product name
4. Click **"Analyze Product"**
5. See the health score (0-100)!

---

## Feature Overview

📸 **Upload Product Image** → AI reads label
📝 **Enter Product Name** → AI analyzes known data
🎯 **Get Health Score** 0-100
✅ **See Ingredient Breakdown** with health ratings
📊 **View Macronutrients** extraction
💾 **History** automatically saved

---

## Health Score Guide

| Score | Status | What It Means |
|-------|--------|--------------|
| 80-100 | ✅ Excellent | Whole foods, healthy choice |
| 60-79 | 👍 Good | Balanced, mostly healthy |
| 40-59 | ⚠️ Moderate | Mixed healthy/unhealthy |
| 20-39 | ❌ Poor | Minimize consumption |
| 0-19 | 🚫 Avoid | Ultra-processed, unhealthy |

---

## Files Created

✅ API: `/api/nutrition/analyze` - Analyzes products
✅ API: `/api/nutrition/load` - Gets analysis history  
✅ Dashboard: Nutrition view with full UI
✅ Database: Setup guide

---

## You're All Set! 🎉

The nutrition feature is fully implemented and ready to use.
