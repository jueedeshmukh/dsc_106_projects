# Project 3 — How Hot Will San Diego Summers Get?

An interactive climate visualization exploring how summer temperatures in San Diego may change through 2050 under different greenhouse gas emission scenarios.

---

## What This Shows

This visualization answers the question: **how much hotter will San Diego summers get in our lifetime?**

Using data from the CMIP6 climate model archive, it shows average summer (June–August) temperatures in San Diego from 1950 through 2050, expressed as degrees above the pre-industrial baseline (1850–1900 average). Three future emission scenarios are compared against the historical record:

| Scenario | What it means |
|---|---|
| **Historical** | Observed past climate data (1950–2014) |
| **SSP1-1.9** | Very low emissions — aggressive global climate action |
| **SSP2-4.5** | Moderate emissions — some action taken |
| **SSP5-8.5** | High emissions — business as usual |

The two dashed horizontal lines mark the **Paris Agreement targets** of +1.5°C and +2.0°C above pre-industrial levels. Colored dots mark the year each scenario is projected to cross those thresholds.

---

## How to Use It

- **Check/uncheck scenarios** in the sidebar to show or hide individual emission pathways
- **Hover** over the chart to see exact temperature anomalies for each scenario in a given year
- **Drag the handles** on the mini-chart at the bottom to zoom into a specific time period
- **Scroll** on the main chart to zoom in; **click and drag** to pan left or right

---

## Data Source

- **Dataset:** CMIP6 (Coupled Model Intercomparison Project Phase 6)
- **Model:** GFDL-ESM4 by NOAA-GFDL
- **Variable:** `tas` — near-surface air temperature (monthly)
- **Member:** `r1i1p1f1`
- **Experiments:** `historical`, `ssp119`, `ssp245`, `ssp585`
- **Processing:** June–August months filtered, 5-year rolling average applied, anomaly computed relative to 1850–1900 historical baseline
- **Location:** San Diego, CA (lat 32.7°N, lon 242.9°E)

Data was retrieved via Google Cloud Storage (`gs://cmip6`) and processed in Python using `xarray`, `gcsfs`, and `pandas`.

---

## Project Structure

```
project 3/
├── index.html                    # Page layout, instructions, and styling
├── visualization.js              # All D3.js chart logic
├── san_diego_temp_anomaly.csv    # Pre-processed climate data
└── README.md                     # This file
```

---

## Technical Stack

- **D3.js v7** — all visualization and interaction logic
- **Vanilla HTML/CSS** — layout and styling, no frameworks
- **Python / Google Colab** — data retrieval and preprocessing (not included in this folder)

---

## Design Decisions

**Why temperature anomaly instead of raw temperature?**
Anomaly (difference from a baseline) makes it easier to see change over time and allows direct comparison to the Paris Agreement targets, which are defined in terms of warming above pre-industrial levels.

**Why a 5-year rolling average?**
Raw annual summer averages are noisy year-to-year due to natural climate variability. A 5-year rolling average smooths this out while preserving the long-term warming trend — making the story clearer for a general audience.

**Why these three future scenarios?**
SSP1-1.9, SSP2-4.5, and SSP5-8.5 represent a meaningful spread from optimistic to pessimistic futures, giving viewers a sense of how much our choices matter. All three are available for the GFDL-ESM4 model with the same ensemble member, ensuring a consistent comparison.

**Why animated line drawing on load?**
Introducing lines one at a time prevents the chart from being overwhelming on first view and gives the viewer time to understand each scenario before the next appears.
