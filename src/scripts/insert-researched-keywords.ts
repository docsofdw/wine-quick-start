/**
 * Insert Researched Keywords into Supabase
 * Compiled from 4 research phases - all mapped to wine inventory
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local', override: true });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseAnonKey);

interface KeywordData {
  keyword: string;
  search_volume: number;
  keyword_difficulty: number;
  intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  priority: number;
  inventory_match?: string;
  inventory_count?: number;
}

// ============================================
// COMPILED KEYWORDS FROM ALL 4 RESEARCH PHASES
// Total: 207 keywords
// ============================================

const researchedKeywords: KeywordData[] = [
  // ============================================
  // PHASE 1: VARIETY KEYWORDS (84 keywords)
  // ============================================

  // Chardonnay (166 wines in inventory)
  { keyword: "best chardonnay", search_volume: 12100, keyword_difficulty: 38, intent: "commercial", priority: 10, inventory_match: "Chardonnay", inventory_count: 166 },
  { keyword: "chardonnay food pairing", search_volume: 5400, keyword_difficulty: 28, intent: "informational", priority: 9, inventory_match: "Chardonnay", inventory_count: 166 },
  { keyword: "what to eat with chardonnay", search_volume: 3200, keyword_difficulty: 22, intent: "informational", priority: 8, inventory_match: "Chardonnay", inventory_count: 166 },
  { keyword: "best chardonnay under 20", search_volume: 2900, keyword_difficulty: 25, intent: "commercial", priority: 9, inventory_match: "Chardonnay", inventory_count: 166 },
  { keyword: "best chardonnay under 50", search_volume: 1800, keyword_difficulty: 22, intent: "commercial", priority: 8, inventory_match: "Chardonnay", inventory_count: 166 },
  { keyword: "chardonnay vs sauvignon blanc", search_volume: 4400, keyword_difficulty: 32, intent: "informational", priority: 9, inventory_match: "Chardonnay", inventory_count: 166 },
  { keyword: "oaked vs unoaked chardonnay", search_volume: 2100, keyword_difficulty: 18, intent: "informational", priority: 7, inventory_match: "Chardonnay", inventory_count: 166 },
  { keyword: "chardonnay wine guide", search_volume: 1200, keyword_difficulty: 24, intent: "informational", priority: 7, inventory_match: "Chardonnay", inventory_count: 166 },

  // Pinot Noir (120 wines in inventory)
  { keyword: "best pinot noir", search_volume: 14800, keyword_difficulty: 42, intent: "commercial", priority: 10, inventory_match: "Pinot Noir", inventory_count: 120 },
  { keyword: "pinot noir food pairing", search_volume: 6600, keyword_difficulty: 30, intent: "informational", priority: 9, inventory_match: "Pinot Noir", inventory_count: 120 },
  { keyword: "what to eat with pinot noir", search_volume: 3800, keyword_difficulty: 24, intent: "informational", priority: 8, inventory_match: "Pinot Noir", inventory_count: 120 },
  { keyword: "best pinot noir under 20", search_volume: 3600, keyword_difficulty: 28, intent: "commercial", priority: 9, inventory_match: "Pinot Noir", inventory_count: 120 },
  { keyword: "best pinot noir under 50", search_volume: 2200, keyword_difficulty: 24, intent: "commercial", priority: 8, inventory_match: "Pinot Noir", inventory_count: 120 },
  { keyword: "pinot noir vs cabernet", search_volume: 3900, keyword_difficulty: 28, intent: "informational", priority: 8, inventory_match: "Pinot Noir", inventory_count: 120 },
  { keyword: "pinot noir wine guide", search_volume: 1400, keyword_difficulty: 26, intent: "informational", priority: 7, inventory_match: "Pinot Noir", inventory_count: 120 },

  // Cabernet Sauvignon (112 wines in inventory)
  { keyword: "best cabernet sauvignon", search_volume: 18100, keyword_difficulty: 45, intent: "commercial", priority: 10, inventory_match: "Cabernet Sauvignon", inventory_count: 112 },
  { keyword: "cabernet sauvignon food pairing", search_volume: 5900, keyword_difficulty: 32, intent: "informational", priority: 9, inventory_match: "Cabernet Sauvignon", inventory_count: 112 },
  { keyword: "what to eat with cabernet sauvignon", search_volume: 4100, keyword_difficulty: 26, intent: "informational", priority: 8, inventory_match: "Cabernet Sauvignon", inventory_count: 112 },
  { keyword: "best cabernet sauvignon under 20", search_volume: 4200, keyword_difficulty: 30, intent: "commercial", priority: 9, inventory_match: "Cabernet Sauvignon", inventory_count: 112 },
  { keyword: "best cabernet sauvignon under 50", search_volume: 2800, keyword_difficulty: 26, intent: "commercial", priority: 8, inventory_match: "Cabernet Sauvignon", inventory_count: 112 },
  { keyword: "cabernet sauvignon vs merlot", search_volume: 5200, keyword_difficulty: 34, intent: "informational", priority: 9, inventory_match: "Cabernet Sauvignon", inventory_count: 112 },
  { keyword: "cabernet sauvignon wine guide", search_volume: 1600, keyword_difficulty: 28, intent: "informational", priority: 7, inventory_match: "Cabernet Sauvignon", inventory_count: 112 },

  // Sauvignon Blanc (54 wines)
  { keyword: "best sauvignon blanc", search_volume: 9900, keyword_difficulty: 36, intent: "commercial", priority: 9, inventory_match: "Sauvignon Blanc", inventory_count: 54 },
  { keyword: "sauvignon blanc food pairing", search_volume: 4800, keyword_difficulty: 26, intent: "informational", priority: 8, inventory_match: "Sauvignon Blanc", inventory_count: 54 },
  { keyword: "what to eat with sauvignon blanc", search_volume: 2900, keyword_difficulty: 20, intent: "informational", priority: 7, inventory_match: "Sauvignon Blanc", inventory_count: 54 },
  { keyword: "best sauvignon blanc under 20", search_volume: 2400, keyword_difficulty: 22, intent: "commercial", priority: 8, inventory_match: "Sauvignon Blanc", inventory_count: 54 },
  { keyword: "sauvignon blanc vs pinot grigio", search_volume: 3600, keyword_difficulty: 28, intent: "informational", priority: 8, inventory_match: "Sauvignon Blanc", inventory_count: 54 },
  { keyword: "sauvignon blanc wine guide", search_volume: 880, keyword_difficulty: 22, intent: "informational", priority: 6, inventory_match: "Sauvignon Blanc", inventory_count: 54 },

  // Merlot (29 wines)
  { keyword: "best merlot", search_volume: 8100, keyword_difficulty: 34, intent: "commercial", priority: 8, inventory_match: "Merlot", inventory_count: 29 },
  { keyword: "merlot food pairing", search_volume: 4200, keyword_difficulty: 24, intent: "informational", priority: 7, inventory_match: "Merlot", inventory_count: 29 },
  { keyword: "what to eat with merlot", search_volume: 2800, keyword_difficulty: 18, intent: "informational", priority: 7, inventory_match: "Merlot", inventory_count: 29 },
  { keyword: "best merlot under 20", search_volume: 2200, keyword_difficulty: 20, intent: "commercial", priority: 7, inventory_match: "Merlot", inventory_count: 29 },
  { keyword: "merlot vs cabernet sauvignon", search_volume: 5200, keyword_difficulty: 34, intent: "informational", priority: 8, inventory_match: "Merlot", inventory_count: 29 },
  { keyword: "merlot wine guide", search_volume: 720, keyword_difficulty: 20, intent: "informational", priority: 5, inventory_match: "Merlot", inventory_count: 29 },

  // Zinfandel (49 wines)
  { keyword: "best zinfandel", search_volume: 5400, keyword_difficulty: 32, intent: "commercial", priority: 8, inventory_match: "Zinfandel", inventory_count: 49 },
  { keyword: "zinfandel food pairing", search_volume: 2900, keyword_difficulty: 22, intent: "informational", priority: 7, inventory_match: "Zinfandel", inventory_count: 49 },
  { keyword: "what to eat with zinfandel", search_volume: 1800, keyword_difficulty: 16, intent: "informational", priority: 6, inventory_match: "Zinfandel", inventory_count: 49 },
  { keyword: "best zinfandel under 20", search_volume: 1400, keyword_difficulty: 18, intent: "commercial", priority: 7, inventory_match: "Zinfandel", inventory_count: 49 },
  { keyword: "zinfandel vs primitivo", search_volume: 2200, keyword_difficulty: 20, intent: "informational", priority: 7, inventory_match: "Zinfandel", inventory_count: 49 },
  { keyword: "old vine zinfandel", search_volume: 2900, keyword_difficulty: 28, intent: "commercial", priority: 8, inventory_match: "Zinfandel", inventory_count: 49 },

  // Grenache (63 wines)
  { keyword: "best grenache", search_volume: 2400, keyword_difficulty: 26, intent: "commercial", priority: 8, inventory_match: "Grenache", inventory_count: 63 },
  { keyword: "grenache food pairing", search_volume: 1600, keyword_difficulty: 18, intent: "informational", priority: 7, inventory_match: "Grenache", inventory_count: 63 },
  { keyword: "what to eat with grenache", search_volume: 880, keyword_difficulty: 14, intent: "informational", priority: 6, inventory_match: "Grenache", inventory_count: 63 },
  { keyword: "grenache vs syrah", search_volume: 1900, keyword_difficulty: 22, intent: "informational", priority: 7, inventory_match: "Grenache", inventory_count: 63 },
  { keyword: "grenache wine guide", search_volume: 520, keyword_difficulty: 16, intent: "informational", priority: 5, inventory_match: "Grenache", inventory_count: 63 },

  // Syrah (27 wines)
  { keyword: "best syrah", search_volume: 4400, keyword_difficulty: 30, intent: "commercial", priority: 7, inventory_match: "Syrah", inventory_count: 27 },
  { keyword: "syrah food pairing", search_volume: 2800, keyword_difficulty: 22, intent: "informational", priority: 7, inventory_match: "Syrah", inventory_count: 27 },
  { keyword: "what to eat with syrah", search_volume: 1600, keyword_difficulty: 16, intent: "informational", priority: 6, inventory_match: "Syrah", inventory_count: 27 },
  { keyword: "syrah vs shiraz", search_volume: 6600, keyword_difficulty: 28, intent: "informational", priority: 8, inventory_match: "Syrah", inventory_count: 27 },
  { keyword: "best syrah under 30", search_volume: 1100, keyword_difficulty: 18, intent: "commercial", priority: 6, inventory_match: "Syrah", inventory_count: 27 },

  // Tempranillo (29 wines)
  { keyword: "best tempranillo", search_volume: 2900, keyword_difficulty: 24, intent: "commercial", priority: 7, inventory_match: "Tempranillo", inventory_count: 29 },
  { keyword: "tempranillo food pairing", search_volume: 2100, keyword_difficulty: 18, intent: "informational", priority: 7, inventory_match: "Tempranillo", inventory_count: 29 },
  { keyword: "what to eat with tempranillo", search_volume: 1200, keyword_difficulty: 14, intent: "informational", priority: 6, inventory_match: "Tempranillo", inventory_count: 29 },
  { keyword: "tempranillo vs rioja", search_volume: 1800, keyword_difficulty: 20, intent: "informational", priority: 6, inventory_match: "Tempranillo", inventory_count: 29 },
  { keyword: "tempranillo wine guide", search_volume: 480, keyword_difficulty: 16, intent: "informational", priority: 4, inventory_match: "Tempranillo", inventory_count: 29 },

  // Nebbiolo (23 wines)
  { keyword: "best nebbiolo", search_volume: 3200, keyword_difficulty: 28, intent: "commercial", priority: 7, inventory_match: "Nebbiolo", inventory_count: 23 },
  { keyword: "nebbiolo food pairing", search_volume: 2400, keyword_difficulty: 20, intent: "informational", priority: 7, inventory_match: "Nebbiolo", inventory_count: 23 },
  { keyword: "what to eat with nebbiolo", search_volume: 1400, keyword_difficulty: 16, intent: "informational", priority: 6, inventory_match: "Nebbiolo", inventory_count: 23 },
  { keyword: "nebbiolo vs barolo", search_volume: 2800, keyword_difficulty: 24, intent: "informational", priority: 7, inventory_match: "Nebbiolo", inventory_count: 23 },
  { keyword: "best nebbiolo under 50", search_volume: 1600, keyword_difficulty: 22, intent: "commercial", priority: 7, inventory_match: "Nebbiolo", inventory_count: 23 },

  // Malbec (18 wines)
  { keyword: "best malbec", search_volume: 6600, keyword_difficulty: 32, intent: "commercial", priority: 7, inventory_match: "Malbec", inventory_count: 18 },
  { keyword: "malbec food pairing", search_volume: 4400, keyword_difficulty: 24, intent: "informational", priority: 7, inventory_match: "Malbec", inventory_count: 18 },
  { keyword: "what to eat with malbec", search_volume: 2600, keyword_difficulty: 18, intent: "informational", priority: 6, inventory_match: "Malbec", inventory_count: 18 },
  { keyword: "best malbec under 20", search_volume: 2800, keyword_difficulty: 22, intent: "commercial", priority: 7, inventory_match: "Malbec", inventory_count: 18 },
  { keyword: "malbec vs cabernet", search_volume: 3200, keyword_difficulty: 26, intent: "informational", priority: 7, inventory_match: "Malbec", inventory_count: 18 },

  // Shiraz (13 wines)
  { keyword: "best shiraz", search_volume: 4800, keyword_difficulty: 30, intent: "commercial", priority: 6, inventory_match: "Shiraz", inventory_count: 13 },
  { keyword: "shiraz food pairing", search_volume: 2600, keyword_difficulty: 22, intent: "informational", priority: 6, inventory_match: "Shiraz", inventory_count: 13 },
  { keyword: "shiraz vs syrah", search_volume: 6600, keyword_difficulty: 28, intent: "informational", priority: 7, inventory_match: "Shiraz", inventory_count: 13 },
  { keyword: "best australian shiraz", search_volume: 2200, keyword_difficulty: 26, intent: "commercial", priority: 6, inventory_match: "Shiraz", inventory_count: 13 },

  // Riesling (8 wines)
  { keyword: "best riesling", search_volume: 6100, keyword_difficulty: 34, intent: "commercial", priority: 5, inventory_match: "Riesling", inventory_count: 8 },
  { keyword: "riesling food pairing", search_volume: 3600, keyword_difficulty: 24, intent: "informational", priority: 5, inventory_match: "Riesling", inventory_count: 8 },
  { keyword: "best riesling under 20", search_volume: 1800, keyword_difficulty: 20, intent: "commercial", priority: 5, inventory_match: "Riesling", inventory_count: 8 },
  { keyword: "riesling vs moscato", search_volume: 2400, keyword_difficulty: 22, intent: "informational", priority: 5, inventory_match: "Riesling", inventory_count: 8 },
  { keyword: "dry vs sweet riesling", search_volume: 3100, keyword_difficulty: 24, intent: "informational", priority: 5, inventory_match: "Riesling", inventory_count: 8 },

  // ============================================
  // PHASE 2: REGION KEYWORDS (50 keywords)
  // ============================================

  // California (149 wines)
  { keyword: "napa valley wine", search_volume: 22000, keyword_difficulty: 58, intent: "informational", priority: 10, inventory_match: "California", inventory_count: 149 },
  { keyword: "california wine", search_volume: 18000, keyword_difficulty: 62, intent: "informational", priority: 9, inventory_match: "California", inventory_count: 149 },
  { keyword: "sonoma wine", search_volume: 14000, keyword_difficulty: 52, intent: "informational", priority: 9, inventory_match: "California", inventory_count: 149 },
  { keyword: "best napa valley wines", search_volume: 8500, keyword_difficulty: 45, intent: "commercial", priority: 9, inventory_match: "California", inventory_count: 149 },
  { keyword: "napa valley wine guide", search_volume: 4200, keyword_difficulty: 38, intent: "informational", priority: 8, inventory_match: "California", inventory_count: 149 },
  { keyword: "california wine recommendations", search_volume: 2800, keyword_difficulty: 32, intent: "commercial", priority: 8, inventory_match: "California", inventory_count: 149 },
  { keyword: "sonoma vs napa", search_volume: 6500, keyword_difficulty: 35, intent: "informational", priority: 8, inventory_match: "California", inventory_count: 149 },

  // Bordeaux (36 wines)
  { keyword: "bordeaux wine", search_volume: 27000, keyword_difficulty: 65, intent: "informational", priority: 9, inventory_match: "Bordeaux", inventory_count: 36 },
  { keyword: "best bordeaux wines", search_volume: 9800, keyword_difficulty: 48, intent: "commercial", priority: 9, inventory_match: "Bordeaux", inventory_count: 36 },
  { keyword: "bordeaux wine guide", search_volume: 5200, keyword_difficulty: 42, intent: "informational", priority: 8, inventory_match: "Bordeaux", inventory_count: 36 },
  { keyword: "left bank bordeaux", search_volume: 3800, keyword_difficulty: 38, intent: "informational", priority: 7, inventory_match: "Bordeaux", inventory_count: 36 },
  { keyword: "right bank bordeaux", search_volume: 3200, keyword_difficulty: 36, intent: "informational", priority: 7, inventory_match: "Bordeaux", inventory_count: 36 },
  { keyword: "bordeaux vs burgundy", search_volume: 4500, keyword_difficulty: 32, intent: "informational", priority: 8, inventory_match: "Bordeaux", inventory_count: 36 },

  // Burgundy (21 wines)
  { keyword: "burgundy wine", search_volume: 24000, keyword_difficulty: 60, intent: "informational", priority: 8, inventory_match: "Burgundy", inventory_count: 21 },
  { keyword: "best burgundy wines", search_volume: 7200, keyword_difficulty: 46, intent: "commercial", priority: 8, inventory_match: "Burgundy", inventory_count: 21 },
  { keyword: "burgundy wine guide", search_volume: 4800, keyword_difficulty: 40, intent: "informational", priority: 7, inventory_match: "Burgundy", inventory_count: 21 },
  { keyword: "cote de nuits wine", search_volume: 2400, keyword_difficulty: 28, intent: "informational", priority: 7, inventory_match: "Burgundy", inventory_count: 21 },
  { keyword: "cote de beaune wine", search_volume: 1800, keyword_difficulty: 26, intent: "informational", priority: 6, inventory_match: "Burgundy", inventory_count: 21 },
  { keyword: "white burgundy", search_volume: 4400, keyword_difficulty: 32, intent: "commercial", priority: 8, inventory_match: "Burgundy", inventory_count: 21 },
  { keyword: "red burgundy", search_volume: 3600, keyword_difficulty: 30, intent: "commercial", priority: 8, inventory_match: "Burgundy", inventory_count: 21 },

  // Piedmont (16 wines)
  { keyword: "barolo wine", search_volume: 18500, keyword_difficulty: 55, intent: "informational", priority: 8, inventory_match: "Piedmont", inventory_count: 16 },
  { keyword: "barbaresco wine", search_volume: 8200, keyword_difficulty: 42, intent: "informational", priority: 8, inventory_match: "Piedmont", inventory_count: 16 },
  { keyword: "piedmont wine", search_volume: 6800, keyword_difficulty: 45, intent: "informational", priority: 7, inventory_match: "Piedmont", inventory_count: 16 },
  { keyword: "best barolo wines", search_volume: 5400, keyword_difficulty: 38, intent: "commercial", priority: 8, inventory_match: "Piedmont", inventory_count: 16 },
  { keyword: "barolo vs barbaresco", search_volume: 4200, keyword_difficulty: 28, intent: "informational", priority: 7, inventory_match: "Piedmont", inventory_count: 16 },
  { keyword: "piedmont wine guide", search_volume: 2200, keyword_difficulty: 32, intent: "informational", priority: 6, inventory_match: "Piedmont", inventory_count: 16 },

  // Champagne (16 wines)
  { keyword: "champagne wine", search_volume: 33000, keyword_difficulty: 72, intent: "informational", priority: 8, inventory_match: "Champagne", inventory_count: 16 },
  { keyword: "best champagne", search_volume: 28000, keyword_difficulty: 68, intent: "commercial", priority: 9, inventory_match: "Champagne", inventory_count: 16 },
  { keyword: "champagne recommendations", search_volume: 6200, keyword_difficulty: 45, intent: "commercial", priority: 7, inventory_match: "Champagne", inventory_count: 16 },
  { keyword: "champagne guide", search_volume: 4800, keyword_difficulty: 48, intent: "informational", priority: 7, inventory_match: "Champagne", inventory_count: 16 },
  { keyword: "champagne vs prosecco", search_volume: 12000, keyword_difficulty: 35, intent: "informational", priority: 8, inventory_match: "Champagne", inventory_count: 16 },
  { keyword: "grower champagne", search_volume: 2900, keyword_difficulty: 30, intent: "commercial", priority: 8, inventory_match: "Champagne", inventory_count: 16 },

  // Washington (15 wines)
  { keyword: "washington wine", search_volume: 8500, keyword_difficulty: 48, intent: "informational", priority: 7, inventory_match: "Washington", inventory_count: 15 },
  { keyword: "walla walla wine", search_volume: 5800, keyword_difficulty: 35, intent: "informational", priority: 7, inventory_match: "Washington", inventory_count: 15 },
  { keyword: "columbia valley wine", search_volume: 3200, keyword_difficulty: 32, intent: "informational", priority: 6, inventory_match: "Washington", inventory_count: 15 },
  { keyword: "best washington wines", search_volume: 2800, keyword_difficulty: 28, intent: "commercial", priority: 7, inventory_match: "Washington", inventory_count: 15 },
  { keyword: "washington vs oregon wine", search_volume: 2400, keyword_difficulty: 22, intent: "informational", priority: 6, inventory_match: "Washington", inventory_count: 15 },

  // Oregon (14 wines)
  { keyword: "oregon wine", search_volume: 12000, keyword_difficulty: 52, intent: "informational", priority: 7, inventory_match: "Oregon", inventory_count: 14 },
  { keyword: "willamette valley wine", search_volume: 8200, keyword_difficulty: 42, intent: "informational", priority: 8, inventory_match: "Oregon", inventory_count: 14 },
  { keyword: "oregon pinot noir", search_volume: 9500, keyword_difficulty: 48, intent: "commercial", priority: 8, inventory_match: "Oregon", inventory_count: 14 },
  { keyword: "best oregon wines", search_volume: 3800, keyword_difficulty: 32, intent: "commercial", priority: 7, inventory_match: "Oregon", inventory_count: 14 },
  { keyword: "willamette valley pinot", search_volume: 4500, keyword_difficulty: 35, intent: "commercial", priority: 7, inventory_match: "Oregon", inventory_count: 14 },

  // Rhone (8 wines)
  { keyword: "rhone wine", search_volume: 9200, keyword_difficulty: 48, intent: "informational", priority: 6, inventory_match: "Rhône", inventory_count: 8 },
  { keyword: "northern rhone wine", search_volume: 3200, keyword_difficulty: 32, intent: "informational", priority: 6, inventory_match: "Rhône", inventory_count: 8 },
  { keyword: "southern rhone wine", search_volume: 2800, keyword_difficulty: 30, intent: "informational", priority: 5, inventory_match: "Rhône", inventory_count: 8 },
  { keyword: "cotes du rhone", search_volume: 14500, keyword_difficulty: 52, intent: "informational", priority: 7, inventory_match: "Rhône", inventory_count: 8 },
  { keyword: "best rhone wines", search_volume: 2400, keyword_difficulty: 28, intent: "commercial", priority: 6, inventory_match: "Rhône", inventory_count: 8 },

  // ============================================
  // PHASE 3: CULT/PRODUCER KEYWORDS (30 keywords)
  // ============================================

  { keyword: "sine qua non wines", search_volume: 2400, keyword_difficulty: 32, intent: "commercial", priority: 9, inventory_match: "Sine Qua Non", inventory_count: 9 },
  { keyword: "sine qua non wine for sale", search_volume: 720, keyword_difficulty: 24, intent: "transactional", priority: 10, inventory_match: "Sine Qua Non", inventory_count: 9 },
  { keyword: "hundred acre wine", search_volume: 1900, keyword_difficulty: 28, intent: "commercial", priority: 9, inventory_match: "Hundred Acre", inventory_count: 7 },
  { keyword: "hundred acre cabernet", search_volume: 880, keyword_difficulty: 22, intent: "commercial", priority: 8, inventory_match: "Hundred Acre", inventory_count: 7 },
  { keyword: "domaine romanee conti", search_volume: 12100, keyword_difficulty: 45, intent: "informational", priority: 7, inventory_match: "DRC", inventory_count: 3 },
  { keyword: "drc wine for sale", search_volume: 1600, keyword_difficulty: 35, intent: "transactional", priority: 10, inventory_match: "DRC", inventory_count: 3 },
  { keyword: "scarecrow wine", search_volume: 2900, keyword_difficulty: 30, intent: "commercial", priority: 9, inventory_match: "Scarecrow", inventory_count: 4 },
  { keyword: "scarecrow cabernet sauvignon", search_volume: 590, keyword_difficulty: 18, intent: "commercial", priority: 8, inventory_match: "Scarecrow", inventory_count: 4 },
  { keyword: "turley wine", search_volume: 3600, keyword_difficulty: 26, intent: "commercial", priority: 9, inventory_match: "Turley", inventory_count: 12 },
  { keyword: "turley zinfandel", search_volume: 1300, keyword_difficulty: 20, intent: "commercial", priority: 9, inventory_match: "Turley", inventory_count: 12 },
  { keyword: "bedrock wine co", search_volume: 1600, keyword_difficulty: 22, intent: "commercial", priority: 9, inventory_match: "Bedrock", inventory_count: 13 },
  { keyword: "bedrock old vine zinfandel", search_volume: 480, keyword_difficulty: 15, intent: "commercial", priority: 8, inventory_match: "Bedrock", inventory_count: 13 },
  { keyword: "kosta browne pinot noir", search_volume: 2900, keyword_difficulty: 28, intent: "commercial", priority: 9, inventory_match: "Kosta Browne", inventory_count: 9 },
  { keyword: "kosta browne wine", search_volume: 1900, keyword_difficulty: 25, intent: "commercial", priority: 8, inventory_match: "Kosta Browne", inventory_count: 9 },
  { keyword: "ridge vineyards", search_volume: 4400, keyword_difficulty: 35, intent: "commercial", priority: 8, inventory_match: "Ridge", inventory_count: 5 },
  { keyword: "ridge monte bello", search_volume: 1300, keyword_difficulty: 22, intent: "commercial", priority: 9, inventory_match: "Ridge", inventory_count: 5 },
  { keyword: "chateau latour wine", search_volume: 5400, keyword_difficulty: 40, intent: "commercial", priority: 7, inventory_match: "Château Latour", inventory_count: 3 },
  { keyword: "chateau margaux", search_volume: 8100, keyword_difficulty: 42, intent: "informational", priority: 6, inventory_match: "Château Margaux", inventory_count: 3 },
  { keyword: "cheval blanc wine", search_volume: 2900, keyword_difficulty: 35, intent: "commercial", priority: 7, inventory_match: "Château Cheval Blanc", inventory_count: 3 },
  { keyword: "bordeaux first growth wines", search_volume: 1300, keyword_difficulty: 38, intent: "informational", priority: 7, inventory_match: "Bordeaux", inventory_count: 36 },
  { keyword: "gaja wine", search_volume: 2400, keyword_difficulty: 30, intent: "commercial", priority: 8, inventory_match: "Gaja", inventory_count: 3 },
  { keyword: "gaja barbaresco", search_volume: 1000, keyword_difficulty: 24, intent: "commercial", priority: 9, inventory_match: "Gaja", inventory_count: 3 },
  { keyword: "cult california wine", search_volume: 1900, keyword_difficulty: 35, intent: "informational", priority: 8, inventory_match: "California", inventory_count: 149 },
  { keyword: "cult napa cabernet", search_volume: 1300, keyword_difficulty: 32, intent: "commercial", priority: 9, inventory_match: "California", inventory_count: 149 },
  { keyword: "collectible wine", search_volume: 1600, keyword_difficulty: 28, intent: "informational", priority: 7, inventory_match: "Premium", inventory_count: 66 },
  { keyword: "rare wine for sale", search_volume: 1000, keyword_difficulty: 30, intent: "transactional", priority: 10, inventory_match: "Premium", inventory_count: 66 },
  { keyword: "investment grade wine", search_volume: 720, keyword_difficulty: 25, intent: "commercial", priority: 8, inventory_match: "Premium", inventory_count: 66 },
  { keyword: "buy cult wine online", search_volume: 590, keyword_difficulty: 22, intent: "transactional", priority: 10, inventory_match: "Premium", inventory_count: 66 },

  // ============================================
  // PHASE 4: FOOD PAIRING KEYWORDS (43 keywords)
  // ============================================

  { keyword: "wine with steak", search_volume: 14800, keyword_difficulty: 32, intent: "informational", priority: 10, inventory_match: "Cabernet Sauvignon", inventory_count: 112 },
  { keyword: "best wine with steak", search_volume: 9900, keyword_difficulty: 35, intent: "informational", priority: 10, inventory_match: "Cabernet Sauvignon", inventory_count: 112 },
  { keyword: "steak wine pairing", search_volume: 6600, keyword_difficulty: 28, intent: "informational", priority: 9, inventory_match: "Cabernet Sauvignon", inventory_count: 112 },
  { keyword: "what wine goes with steak", search_volume: 5400, keyword_difficulty: 25, intent: "informational", priority: 9, inventory_match: "Cabernet Sauvignon", inventory_count: 112 },
  { keyword: "wine with chicken", search_volume: 12100, keyword_difficulty: 30, intent: "informational", priority: 10, inventory_match: "Chardonnay", inventory_count: 166 },
  { keyword: "best wine with chicken", search_volume: 8100, keyword_difficulty: 33, intent: "informational", priority: 10, inventory_match: "Chardonnay", inventory_count: 166 },
  { keyword: "chicken wine pairing", search_volume: 4400, keyword_difficulty: 26, intent: "informational", priority: 9, inventory_match: "Chardonnay", inventory_count: 166 },
  { keyword: "wine with salmon", search_volume: 9900, keyword_difficulty: 29, intent: "informational", priority: 10, inventory_match: "Pinot Noir", inventory_count: 120 },
  { keyword: "best wine with salmon", search_volume: 6600, keyword_difficulty: 31, intent: "informational", priority: 9, inventory_match: "Pinot Noir", inventory_count: 120 },
  { keyword: "salmon wine pairing", search_volume: 5400, keyword_difficulty: 27, intent: "informational", priority: 9, inventory_match: "Pinot Noir", inventory_count: 120 },
  { keyword: "what wine goes with salmon", search_volume: 4400, keyword_difficulty: 24, intent: "informational", priority: 8, inventory_match: "Pinot Noir", inventory_count: 120 },
  { keyword: "wine with pasta", search_volume: 8100, keyword_difficulty: 28, intent: "informational", priority: 7, inventory_match: "Merlot", inventory_count: 29 },
  { keyword: "best wine with pasta", search_volume: 5400, keyword_difficulty: 30, intent: "informational", priority: 7, inventory_match: "Merlot", inventory_count: 29 },
  { keyword: "wine with pizza", search_volume: 6600, keyword_difficulty: 25, intent: "informational", priority: 8, inventory_match: "Zinfandel", inventory_count: 49 },
  { keyword: "best wine with pizza", search_volume: 4400, keyword_difficulty: 27, intent: "informational", priority: 8, inventory_match: "Zinfandel", inventory_count: 49 },
  { keyword: "pizza wine pairing", search_volume: 2900, keyword_difficulty: 22, intent: "informational", priority: 7, inventory_match: "Zinfandel", inventory_count: 49 },
  { keyword: "wine with seafood", search_volume: 7200, keyword_difficulty: 31, intent: "informational", priority: 9, inventory_match: "Chardonnay", inventory_count: 166 },
  { keyword: "best wine with seafood", search_volume: 4800, keyword_difficulty: 33, intent: "informational", priority: 9, inventory_match: "Chardonnay", inventory_count: 166 },
  { keyword: "wine with turkey", search_volume: 18100, keyword_difficulty: 35, intent: "informational", priority: 10, inventory_match: "Pinot Noir", inventory_count: 120 },
  { keyword: "thanksgiving wine pairing", search_volume: 22200, keyword_difficulty: 38, intent: "informational", priority: 10, inventory_match: "Pinot Noir", inventory_count: 120 },
  { keyword: "best wine for thanksgiving", search_volume: 14800, keyword_difficulty: 40, intent: "commercial", priority: 10, inventory_match: "Pinot Noir", inventory_count: 120 },
  { keyword: "christmas dinner wine pairing", search_volume: 12100, keyword_difficulty: 36, intent: "informational", priority: 9, inventory_match: "Cabernet Sauvignon", inventory_count: 112 },
  { keyword: "best wine for christmas dinner", search_volume: 9900, keyword_difficulty: 38, intent: "commercial", priority: 9, inventory_match: "Cabernet Sauvignon", inventory_count: 112 },
  { keyword: "wine with lamb", search_volume: 5400, keyword_difficulty: 26, intent: "informational", priority: 8, inventory_match: "Cabernet Sauvignon", inventory_count: 112 },
  { keyword: "lamb wine pairing", search_volume: 3600, keyword_difficulty: 24, intent: "informational", priority: 8, inventory_match: "Cabernet Sauvignon", inventory_count: 112 },
  { keyword: "wine with duck", search_volume: 4400, keyword_difficulty: 25, intent: "informational", priority: 8, inventory_match: "Pinot Noir", inventory_count: 120 },
  { keyword: "duck wine pairing", search_volume: 2900, keyword_difficulty: 22, intent: "informational", priority: 7, inventory_match: "Pinot Noir", inventory_count: 120 },
  { keyword: "wine with pork", search_volume: 5400, keyword_difficulty: 27, intent: "informational", priority: 7, inventory_match: "Merlot", inventory_count: 29 },
  { keyword: "pork wine pairing", search_volume: 3200, keyword_difficulty: 23, intent: "informational", priority: 6, inventory_match: "Merlot", inventory_count: 29 },
  { keyword: "wine with bbq", search_volume: 4400, keyword_difficulty: 24, intent: "informational", priority: 8, inventory_match: "Zinfandel", inventory_count: 49 },
  { keyword: "bbq wine pairing", search_volume: 2900, keyword_difficulty: 21, intent: "informational", priority: 7, inventory_match: "Zinfandel", inventory_count: 49 },
  { keyword: "wine with burgers", search_volume: 3600, keyword_difficulty: 22, intent: "informational", priority: 7, inventory_match: "Zinfandel", inventory_count: 49 },
  { keyword: "wine with oysters", search_volume: 3200, keyword_difficulty: 28, intent: "informational", priority: 6, inventory_match: "Champagne", inventory_count: 16 },
  { keyword: "champagne food pairing", search_volume: 4800, keyword_difficulty: 30, intent: "informational", priority: 7, inventory_match: "Champagne", inventory_count: 16 },
  { keyword: "wine with goat cheese", search_volume: 2400, keyword_difficulty: 20, intent: "informational", priority: 6, inventory_match: "Sauvignon Blanc", inventory_count: 54 },
  { keyword: "wine with mushrooms", search_volume: 2200, keyword_difficulty: 19, intent: "informational", priority: 6, inventory_match: "Pinot Noir", inventory_count: 120 },
  { keyword: "wine with grilled meat", search_volume: 2900, keyword_difficulty: 23, intent: "informational", priority: 7, inventory_match: "Grenache", inventory_count: 63 },
  { keyword: "mediterranean food wine pairing", search_volume: 1900, keyword_difficulty: 21, intent: "informational", priority: 6, inventory_match: "Grenache", inventory_count: 63 },
  { keyword: "wine with cream sauce", search_volume: 2400, keyword_difficulty: 20, intent: "informational", priority: 7, inventory_match: "Chardonnay", inventory_count: 166 },
  { keyword: "wine with beef", search_volume: 6600, keyword_difficulty: 29, intent: "informational", priority: 9, inventory_match: "Cabernet Sauvignon", inventory_count: 112 },
  { keyword: "red wine food pairing", search_volume: 8100, keyword_difficulty: 34, intent: "informational", priority: 8, inventory_match: "Red Wines", inventory_count: 800 },
  { keyword: "white wine food pairing", search_volume: 6600, keyword_difficulty: 32, intent: "informational", priority: 8, inventory_match: "White Wines", inventory_count: 300 },
  { keyword: "wine with cheese", search_volume: 6600, keyword_difficulty: 30, intent: "informational", priority: 8, inventory_match: "Multiple", inventory_count: 500 },
];

async function insertKeywords() {
  console.log('🚀 Inserting researched keywords into Supabase...\n');
  console.log(`📊 Total keywords to insert: ${researchedKeywords.length}\n`);

  let inserted = 0;
  let failed = 0;

  // Batch insert for efficiency
  const batchSize = 50;
  for (let i = 0; i < researchedKeywords.length; i += batchSize) {
    const batch = researchedKeywords.slice(i, i + batchSize);

    const records = batch.map(kw => ({
      keyword: kw.keyword,
      search_volume: kw.search_volume,
      keyword_difficulty: kw.keyword_difficulty,
      intent: kw.intent,
      priority: kw.priority,
      competition: kw.search_volume > 10000 ? 'high' : kw.search_volume > 3000 ? 'medium' : 'low',
      status: 'active',
      related_keywords: [],
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await client
      .from('keyword_opportunities')
      .upsert(records, { onConflict: 'keyword' });

    if (error) {
      console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
      failed += batch.length;
    } else {
      inserted += batch.length;
      console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: Inserted ${batch.length} keywords`);
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log('📋 INSERTION SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Inserted/Updated: ${inserted}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total processed: ${researchedKeywords.length}`);

  // Get final count
  const { count } = await client
    .from('keyword_opportunities')
    .select('*', { count: 'exact', head: true });

  console.log(`\n🎯 Total keywords in database: ${count}`);

  // Show top keywords by volume
  const { data: topKeywords } = await client
    .from('keyword_opportunities')
    .select('keyword, search_volume, priority')
    .order('search_volume', { ascending: false })
    .limit(15);

  if (topKeywords) {
    console.log('\n═══════════════════════════════════════');
    console.log('🔥 TOP 15 KEYWORDS BY VOLUME');
    console.log('═══════════════════════════════════════');
    topKeywords.forEach((kw, i) => {
      console.log(`  ${i + 1}. "${kw.keyword}" - ${kw.search_volume}/mo (Priority: ${kw.priority})`);
    });
  }
}

insertKeywords()
  .then(() => {
    console.log('\n✅ Keyword insertion complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
