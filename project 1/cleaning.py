import pandas as pd
import numpy as np

# ── 1. LOAD ───────────────────────────────────────────────────────────────────
df = pd.read_csv("grocerydb.csv")
print(f"Original shape: {df.shape}")

# ── 2. REMOVE DUPLICATES ──────────────────────────────────────────────────────
df = df.drop_duplicates()
print(f"After dropping duplicates: {df.shape}")

# ── 3. CLEAN TEXT COLUMNS ─────────────────────────────────────────────────────
# Decode HTML entities in product names (e.g. &#39; → ')
df["name"] = df["name"].str.replace("&#39;", "'", regex=False)
df["name"] = df["name"].str.replace("&amp;", "&", regex=False)

# Standardize store names to title case (already consistent, but just in case)
df["store"] = df["store"].str.strip()
df["category"] = df["category"].str.strip()

# Fill missing brand with "Unknown"
df["brand"] = df["brand"].fillna("Unknown").str.strip()

# ── 4. HANDLE MISSING NUMERIC VALUES ──────────────────────────────────────────
# price: ~15% missing — drop rows where price is null (needed for our viz)
df = df.dropna(subset=["price"])
print(f"After dropping missing price rows: {df.shape}")

# price_percal: drop rows where missing (larger % missing)
df = df.dropna(subset=["price percal"])
print(f"After dropping missing price percal rows: {df.shape}")

# package_weight: fill with median per category (reasonable imputation)
df["package_weight"] = df.groupby("category")["package_weight"].transform(
    lambda x: x.fillna(x.median())
)
# If still null (entire category was null), fill with global median
df["package_weight"] = df["package_weight"].fillna(df["package_weight"].median())

# Sugars and Fiber: only 9 missing each — fill with 0 (likely not measured = 0)
df["Sugars, total"] = df["Sugars, total"].fillna(0)
df["Fiber, total dietary"] = df["Fiber, total dietary"].fillna(0)

# ── 5. REMOVE OUTLIERS ────────────────────────────────────────────────────────
# Price: cap at 99th percentile to remove extreme outliers (max was $72.99)
price_cap = df["price"].quantile(0.99)
df = df[df["price"] <= price_cap]
print(f"Price cap at 99th percentile (${price_cap:.2f}): {df.shape}")

# price percal: same treatment
percal_cap = df["price percal"].quantile(0.99)
df = df[df["price percal"] <= percal_cap]
print(f"price percal cap at 99th percentile: {df.shape}")

# FPro: already bounded 0–1 by design, no outlier removal needed
# Nutritional columns (Protein, Fat, etc.): normalized per 100g, cap at 100
nutrient_cols = ["Protein", "Total Fat", "Carbohydrate", "Sugars, total",
                 "Fiber, total dietary", "Sodium", "Cholesterol"]
for col in nutrient_cols:
    df = df[df[col] <= 100]
    df = df[df[col] >= 0]

print(f"After nutrient bounds check: {df.shape}")

# ── 6. VALIDATE FPro_class ────────────────────────────────────────────────────
# Should only be 0, 1, 2, or 3
valid_classes = [0.0, 1.0, 2.0, 3.0]
df = df[df["FPro_class"].isin(valid_classes)]
print(f"After FPro_class validation: {df.shape}")

# ── 7. FINAL CHECK ────────────────────────────────────────────────────────────
print("\nFinal missing values:")
print(df.isnull().sum())
print(f"\nFinal shape: {df.shape}")
print(f"Stores: {df['store'].unique()}")

# ── 8. EXPORT ─────────────────────────────────────────────────────────────────
df.to_csv("grocerydb_cleaned.csv", index=False)
print("\nSaved to grocerydb_cleaned.csv")