/**
 * Wine Region Data Module
 *
 * Provides unique, factual information about wine regions to make
 * articles more distinctive and valuable. Data includes:
 * - Geographic and climate information
 * - Key facts and statistics
 * - Notable producers
 * - Food pairing traditions
 * - Price expectations
 */

export interface RegionData {
  name: string;
  country: string;
  aliases: string[];
  climate: string;
  terroir: string;
  keyVarieties: string[];
  notableProducers: string[];
  averagePriceRange: { min: number; max: number };
  bestVintages: number[];
  facts: string[];
  pairingTraditions: string[];
  servingNotes: string;
  cellaring: string;
}

export const wineRegions: Record<string, RegionData> = {
  // France
  'bordeaux': {
    name: 'Bordeaux',
    country: 'France',
    aliases: ['left bank', 'right bank', 'médoc', 'saint-émilion', 'pauillac', 'margaux'],
    climate: 'Maritime climate moderated by the Atlantic Ocean and Gironde estuary, with warm summers and mild, wet winters.',
    terroir: 'Diverse soils ranging from gravel on the Left Bank (ideal for Cabernet Sauvignon) to clay and limestone on the Right Bank (favoring Merlot).',
    keyVarieties: ['Cabernet Sauvignon', 'Merlot', 'Cabernet Franc', 'Petit Verdot', 'Malbec', 'Sauvignon Blanc', 'Sémillon'],
    notableProducers: ['Château Lafite Rothschild', 'Château Margaux', 'Château Latour', 'Château Mouton Rothschild', 'Château Haut-Brion', 'Pétrus', 'Château Cheval Blanc'],
    averagePriceRange: { min: 15, max: 1000 },
    bestVintages: [2020, 2019, 2018, 2016, 2015, 2010, 2009, 2005, 2000],
    facts: [
      'Bordeaux has over 7,000 châteaux and produces approximately 700 million bottles annually.',
      'The 1855 Classification remains the most famous wine ranking system, still used today.',
      'Left Bank wines are Cabernet Sauvignon dominant, while Right Bank wines favor Merlot.',
      'Bordeaux\'s wine industry generates over €14 billion annually for the French economy.',
      'The region has been producing wine for over 2,000 years since Roman occupation.'
    ],
    pairingTraditions: [
      'Entrecôte à la Bordelaise (steak with bone marrow and shallot sauce)',
      'Lamb from Pauillac',
      'Canelés (caramelized pastry)',
      'Oysters from Arcachon Basin with crisp white Bordeaux'
    ],
    servingNotes: 'Serve Left Bank reds at 64-66°F after decanting 1-2 hours for young wines. Right Bank wines are often approachable earlier.',
    cellaring: 'Top Bordeaux can age 20-50+ years. Classified growths from great vintages benefit from 10-15 years of cellaring minimum.'
  },

  'burgundy': {
    name: 'Burgundy',
    country: 'France',
    aliases: ['bourgogne', 'côte d\'or', 'côte de nuits', 'côte de beaune', 'chablis', 'beaujolais'],
    climate: 'Continental climate with cold winters, warm summers, and significant vintage variation. Spring frost is a perpetual concern.',
    terroir: 'Limestone and clay soils on east-facing slopes. The concept of terroir was born here—each vineyard parcel (climat) has distinct character.',
    keyVarieties: ['Pinot Noir', 'Chardonnay', 'Gamay', 'Aligoté'],
    notableProducers: ['Domaine de la Romanée-Conti', 'Domaine Leroy', 'Domaine Leflaive', 'Domaine Coche-Dury', 'Domaine Armand Rousseau', 'Maison Louis Jadot'],
    averagePriceRange: { min: 20, max: 5000 },
    bestVintages: [2020, 2019, 2017, 2015, 2014, 2012, 2010, 2009, 2005],
    facts: [
      'Burgundy\'s vineyard classification dates to 1861, predating Bordeaux\'s famous 1855 Classification.',
      'The Côte d\'Or is only 50km long but contains 33 Grand Cru vineyards.',
      'Romanée-Conti is the most expensive wine in the world, averaging over $20,000 per bottle.',
      'Monks, particularly Cistercians, developed Burgundy\'s vineyard classifications over centuries.',
      'A single Grand Cru vineyard may be divided among 80+ different owners.'
    ],
    pairingTraditions: [
      'Boeuf Bourguignon (beef braised in red wine)',
      'Coq au Vin',
      'Escargots de Bourgogne',
      'Époisses cheese',
      'Gougères (cheese puffs)'
    ],
    servingNotes: 'Serve red Burgundy at 60-64°F in large-bowled glasses. Young wines benefit from 30-60 minutes of decanting.',
    cellaring: 'Village wines: 5-10 years. Premier Cru: 10-20 years. Grand Cru: 15-40+ years in optimal conditions.'
  },

  'champagne': {
    name: 'Champagne',
    country: 'France',
    aliases: ['reims', 'épernay', 'montagne de reims', 'côte des blancs', 'vallée de la marne'],
    climate: 'Cool continental climate at the northern limit of grape cultivation. Average temperature is just 50°F.',
    terroir: 'Chalk subsoil (up to 200m deep) provides excellent drainage and reflects light, helping grapes ripen in the marginal climate.',
    keyVarieties: ['Chardonnay', 'Pinot Noir', 'Pinot Meunier'],
    notableProducers: ['Dom Pérignon', 'Krug', 'Louis Roederer', 'Bollinger', 'Salon', 'Jacques Selosse', 'Egly-Ouriet'],
    averagePriceRange: { min: 35, max: 500 },
    bestVintages: [2012, 2008, 2002, 1996, 1990, 1988, 1985, 1982],
    facts: [
      'Champagne can only legally come from the Champagne region—everything else is sparkling wine.',
      'The traditional method requires 15 months minimum aging on lees; vintage Champagne requires 36 months.',
      'There are approximately 15,000 grape growers in Champagne, but only 5,000 make their own wine.',
      'A Champagne bottle contains approximately 49 million bubbles.',
      'The pressure in a Champagne bottle is 6 atmospheres—three times the pressure in a car tire.'
    ],
    pairingTraditions: [
      'Oysters and shellfish',
      'Caviar',
      'Fried chicken (an unexpected but classic pairing)',
      'Aged Comté cheese',
      'Brioche and croissants'
    ],
    servingNotes: 'Serve at 45-48°F. Use flutes for younger wines, white wine glasses for aged Champagne to appreciate complexity.',
    cellaring: 'Non-vintage: Best within 3-5 years. Vintage: 10-20 years. Prestige cuvées: 20-40+ years.'
  },

  'rhone': {
    name: 'Rhône Valley',
    country: 'France',
    aliases: ['côtes du rhône', 'châteauneuf-du-pape', 'hermitage', 'côte-rôtie', 'northern rhône', 'southern rhône'],
    climate: 'Northern Rhône: Continental with hot summers. Southern Rhône: Mediterranean with intense sun and the mistral wind.',
    terroir: 'Northern: Steep granite slopes. Southern: Round stones (galets) that absorb heat and warm vines at night.',
    keyVarieties: ['Syrah', 'Grenache', 'Mourvèdre', 'Viognier', 'Roussanne', 'Marsanne'],
    notableProducers: ['E. Guigal', 'M. Chapoutier', 'Jean-Louis Chave', 'Château Rayas', 'Domaine du Vieux Télégraphe', 'Clos des Papes'],
    averagePriceRange: { min: 12, max: 400 },
    bestVintages: [2019, 2017, 2016, 2015, 2012, 2010, 2009, 2007, 2005],
    facts: [
      'The Rhône is France\'s second-largest appellation after Bordeaux.',
      'Châteauneuf-du-Pape allows 13 different grape varieties in its blend.',
      'The famous galets (rounded stones) in Châteauneuf-du-Pape can reach temperatures of 60°C (140°F).',
      'Côte-Rôtie means "roasted slope"—a reference to the intense sun exposure.',
      'Hermitage was considered equal to or better than top Bordeaux in the 19th century.'
    ],
    pairingTraditions: [
      'Daube Provençale (beef stew with olives and herbs)',
      'Lamb with herbs de Provence',
      'Tapenade',
      'Ratatouille',
      'Saucisson and charcuterie'
    ],
    servingNotes: 'Northern Rhône Syrah: 62-65°F with 1 hour decanting. Southern blends: 64-68°F, less decanting needed.',
    cellaring: 'Côtes du Rhône: 3-5 years. Châteauneuf-du-Pape: 10-20 years. Hermitage/Côte-Rôtie: 15-30+ years.'
  },

  // Italy
  'piedmont': {
    name: 'Piedmont',
    country: 'Italy',
    aliases: ['barolo', 'barbaresco', 'langhe', 'roero', 'asti', 'piemonte'],
    climate: 'Continental with cold, foggy winters and warm, dry summers. Significant diurnal temperature variation.',
    terroir: 'Calcareous marl and clay soils. South-facing hillside vineyards are essential for ripening Nebbiolo.',
    keyVarieties: ['Nebbiolo', 'Barbera', 'Dolcetto', 'Moscato', 'Arneis', 'Cortese'],
    notableProducers: ['Giacomo Conterno', 'Bruno Giacosa', 'Bartolo Mascarello', 'Gaja', 'Vietti', 'Produttori del Barbaresco'],
    averagePriceRange: { min: 15, max: 800 },
    bestVintages: [2019, 2016, 2015, 2013, 2010, 2006, 2004, 2001, 1999],
    facts: [
      'Barolo is called "the King of Wines and the Wine of Kings."',
      'Nebbiolo is named for the fog (nebbia) that blankets the Langhe hills during harvest.',
      'Barolo must age minimum 38 months (18 in wood); Riserva requires 62 months.',
      'Despite Nebbiolo\'s fame, Barbera is actually more widely planted in Piedmont.',
      'The white truffle of Alba is considered the world\'s most valuable culinary ingredient.'
    ],
    pairingTraditions: [
      'Tajarin (egg pasta) with butter and white truffles',
      'Brasato al Barolo (beef braised in Barolo)',
      'Vitello tonnato',
      'Bollito misto (mixed boiled meats)',
      'Aged Parmigiano-Reggiano'
    ],
    servingNotes: 'Serve Barolo at 64-68°F after decanting 2-4 hours for wines under 15 years old. Older wines need less air.',
    cellaring: 'Dolcetto: 2-5 years. Barbera: 5-10 years. Barbaresco: 10-20 years. Barolo: 15-40+ years.'
  },

  'tuscany': {
    name: 'Tuscany',
    country: 'Italy',
    aliases: ['chianti', 'brunello di montalcino', 'bolgheri', 'super tuscan', 'vino nobile di montepulciano'],
    climate: 'Mediterranean with hot, dry summers and mild winters. Coastal areas moderated by sea breezes.',
    terroir: 'Galestro (calcium-rich marl) and alberese (limestone) in Chianti. Varied soils in coastal Bolgheri.',
    keyVarieties: ['Sangiovese', 'Cabernet Sauvignon', 'Merlot', 'Vernaccia', 'Trebbiano'],
    notableProducers: ['Biondi-Santi', 'Soldera', 'Ornellaia', 'Sassicaia', 'Tignanello', 'Fontodi', 'Montevertine'],
    averagePriceRange: { min: 12, max: 500 },
    bestVintages: [2019, 2016, 2015, 2013, 2010, 2007, 2006, 2004, 2001],
    facts: [
      'Sassicaia (1968) started the "Super Tuscan" movement by using Cabernet in Tuscany.',
      'Brunello di Montalcino must age 5 years before release (6 for Riserva).',
      'The "Black Rooster" (Gallo Nero) has been the symbol of Chianti Classico since the 14th century.',
      'Vernaccia di San Gimignano was the first Italian wine to receive DOC status in 1966.',
      'Tuscany produces over 50 million cases of wine annually.'
    ],
    pairingTraditions: [
      'Bistecca alla Fiorentina (Florentine T-bone steak)',
      'Pappardelle with wild boar ragù',
      'Ribollita (bread soup)',
      'Pecorino Toscano cheese',
      'Crostini with chicken liver pâté'
    ],
    servingNotes: 'Chianti Classico: 62-65°F. Brunello: 64-68°F with 1-2 hours decanting for young wines.',
    cellaring: 'Chianti: 5-10 years. Chianti Classico Riserva: 10-20 years. Brunello: 15-30+ years.'
  },

  // USA
  'napa valley': {
    name: 'Napa Valley',
    country: 'United States',
    aliases: ['napa', 'oakville', 'rutherford', 'stags leap', 'howell mountain', 'diamond mountain'],
    climate: 'Mediterranean with warm, dry summers and mild, wet winters. Significant variation between valley floor and mountain sites.',
    terroir: 'Over 30 soil types in just 30 miles. Volcanic, alluvial, and marine sedimentary soils create diverse expressions.',
    keyVarieties: ['Cabernet Sauvignon', 'Merlot', 'Chardonnay', 'Sauvignon Blanc', 'Zinfandel', 'Pinot Noir'],
    notableProducers: ['Screaming Eagle', 'Harlan Estate', 'Opus One', 'Caymus', 'Stag\'s Leap Wine Cellars', 'Robert Mondavi', 'Dominus'],
    averagePriceRange: { min: 25, max: 1500 },
    bestVintages: [2021, 2019, 2018, 2016, 2015, 2014, 2013, 2012, 2010, 2007],
    facts: [
      'The 1976 Judgment of Paris put Napa on the world stage when local wines beat French classics in blind tasting.',
      'Napa Valley is only 30 miles long and 5 miles wide but contains 16 distinct AVAs.',
      'There are over 400 wineries in Napa Valley.',
      'Napa produces only 4% of California\'s wine but generates 27% of its winery revenue.',
      'The "Rutherford Dust" mineral character is a defining feature of the best Rutherford Cabernets.'
    ],
    pairingTraditions: [
      'Grilled ribeye steak',
      'Lamb chops with herb crust',
      'Aged cheddar and blue cheeses',
      'Wood-fired pizza',
      'Dark chocolate desserts'
    ],
    servingNotes: 'Serve Napa Cabernet at 65-68°F. Young cult wines benefit from 1-2 hours of decanting.',
    cellaring: 'Standard Napa Cab: 5-15 years. Top producers: 15-30+ years. Great vintages from top sites can age 40+ years.'
  },

  'sonoma': {
    name: 'Sonoma County',
    country: 'United States',
    aliases: ['sonoma coast', 'russian river valley', 'dry creek valley', 'alexander valley', 'sonoma valley'],
    climate: 'Highly varied due to Pacific influence. Coastal areas are cool and foggy; inland valleys are warmer.',
    terroir: 'Diverse soils from ancient seabed sediments to volcanic deposits. Marine influence creates cooler growing conditions.',
    keyVarieties: ['Pinot Noir', 'Chardonnay', 'Zinfandel', 'Cabernet Sauvignon', 'Sauvignon Blanc'],
    notableProducers: ['Williams Selyem', 'Kistler', 'Marcassin', 'Peter Michael', 'Flowers', 'Hirsch', 'Littorai'],
    averagePriceRange: { min: 20, max: 200 },
    bestVintages: [2021, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012],
    facts: [
      'Sonoma has over 60,000 acres of vineyards—twice the plantings of Napa.',
      'Russian River Valley is considered one of the world\'s best regions for Pinot Noir.',
      'Sonoma County has 18 distinct AVAs.',
      'Dry Creek Valley is famous for old-vine Zinfandel, some over 100 years old.',
      'The first commercial winery in California was established in Sonoma in 1857.'
    ],
    pairingTraditions: [
      'Pacific salmon (grilled or smoked)',
      'Duck breast with cherry reduction',
      'Dungeness crab',
      'Mushroom dishes (local chanterelles)',
      'Artisanal cheeses from Sonoma creameries'
    ],
    servingNotes: 'Sonoma Pinot: 58-62°F with minimal decanting. Chardonnay: 50-55°F.',
    cellaring: 'Sonoma Pinot Noir: 5-15 years for top producers. Chardonnay: 5-10 years. Old-vine Zin: 10-20 years.'
  },

  'oregon': {
    name: 'Oregon',
    country: 'United States',
    aliases: ['willamette valley', 'dundee hills', 'eola-amity hills', 'chehalem mountains'],
    climate: 'Cool, maritime climate similar to Burgundy. Long, temperate growing seasons with significant vintage variation.',
    terroir: 'Volcanic Jory soils (red, iron-rich) and marine sedimentary soils. Hillside plantings on well-drained slopes.',
    keyVarieties: ['Pinot Noir', 'Pinot Gris', 'Chardonnay', 'Riesling'],
    notableProducers: ['Domaine Drouhin', 'Evening Land', 'Beaux Frères', 'Bergström', 'Cristom', 'Antica Terra', 'Domaine Serene'],
    averagePriceRange: { min: 25, max: 150 },
    bestVintages: [2021, 2019, 2018, 2017, 2016, 2015, 2014, 2012, 2008],
    facts: [
      'Oregon law requires wines labeled by variety to contain at least 90% of that grape (vs 75% federally).',
      'David Lett of Eyrie Vineyards planted the first Pinot Noir in Willamette Valley in 1965.',
      'Oregon Pinot Noir competed against top Burgundy in the 1979 "Wine Olympics" and finished second.',
      'Burgundy giants Drouhin and Méo-Camuzet have established Oregon estates.',
      'The Willamette Valley has 11 distinct sub-AVAs based on soil and climate differences.'
    ],
    pairingTraditions: [
      'Wild salmon (Oregon is famous for it)',
      'Grilled lamb with herbs',
      'Mushroom risotto (local morels and chanterelles)',
      'Hazelnut-crusted dishes',
      'Local artisan cheeses'
    ],
    servingNotes: 'Serve Oregon Pinot at 58-62°F. Most wines are approachable young but can reward short decanting.',
    cellaring: 'Standard Willamette Pinot: 5-12 years. Top single-vineyard: 10-20 years. Exceptional vintages: 20+ years.'
  },

  // Spain
  'rioja': {
    name: 'Rioja',
    country: 'Spain',
    aliases: ['rioja alta', 'rioja alavesa', 'rioja oriental', 'haro'],
    climate: 'Continental influenced by Atlantic and Mediterranean. Rioja Alta is cooler; Rioja Oriental is warmer.',
    terroir: 'Chalk-clay in Rioja Alta and Alavesa; alluvial and iron-rich clay in Rioja Oriental.',
    keyVarieties: ['Tempranillo', 'Garnacha', 'Graciano', 'Mazuelo', 'Viura'],
    notableProducers: ['López de Heredia', 'La Rioja Alta', 'CVNE', 'Marqués de Riscal', 'Muga', 'Artadi', 'Roda'],
    averagePriceRange: { min: 10, max: 200 },
    bestVintages: [2019, 2017, 2016, 2015, 2014, 2011, 2010, 2005, 2004, 2001],
    facts: [
      'Rioja was Spain\'s first DOCa (highest quality designation) in 1991.',
      'Traditional Rioja uses long American oak aging, while "modern" Rioja uses French oak.',
      'López de Heredia releases wines after 10+ years of aging at the winery.',
      'The town of Haro has the highest concentration of century-old wineries in the world.',
      'Rioja\'s classification system (Crianza, Reserva, Gran Reserva) is based on aging, not vineyard quality.'
    ],
    pairingTraditions: [
      'Cordero asado (roast lamb)',
      'Chuletón (massive bone-in ribeye)',
      'Chorizo and morcilla',
      'Patatas a la riojana (potato stew)',
      'Manchego cheese'
    ],
    servingNotes: 'Serve at 62-65°F. Traditional Rioja is ready to drink on release; modern Rioja may benefit from decanting.',
    cellaring: 'Crianza: 3-8 years. Reserva: 8-15 years. Gran Reserva: 15-30+ years.'
  },

  // Australia
  'barossa valley': {
    name: 'Barossa Valley',
    country: 'Australia',
    aliases: ['barossa', 'eden valley', 'south australia'],
    climate: 'Mediterranean with hot, dry summers and cool winters. Warm days and cool nights ideal for Shiraz.',
    terroir: 'Ancient soils ranging from red-brown earth to sandy loam over clay. Some of the oldest vines in the world.',
    keyVarieties: ['Shiraz', 'Cabernet Sauvignon', 'Grenache', 'Mourvèdre', 'Riesling', 'Semillon'],
    notableProducers: ['Penfolds', 'Henschke', 'Torbreck', 'John Duval', 'Turkey Flat', 'Rockford', 'Two Hands'],
    averagePriceRange: { min: 15, max: 850 },
    bestVintages: [2019, 2018, 2017, 2016, 2015, 2013, 2012, 2010, 2006, 2004],
    facts: [
      'The Barossa has vines over 170 years old—among the oldest in the world.',
      'Penfolds Grange is Australia\'s most iconic wine, first made in 1951.',
      'Barossa escaped phylloxera, preserving ungrafted, old-vine material.',
      'German Lutheran settlers established the Barossa in the 1840s.',
      'The region produces 21% of all Australian wine.'
    ],
    pairingTraditions: [
      'Barbecued meats',
      'Slow-roasted lamb shoulder',
      'Aged cheddar',
      'Kangaroo (lean, gamey meat)',
      'Smoked meats and sausages (German heritage)'
    ],
    servingNotes: 'Serve Barossa Shiraz at 64-68°F. Full-bodied wines benefit from 30-60 minutes of decanting.',
    cellaring: 'Standard Shiraz: 5-15 years. Premium producers: 15-25+ years. Grange: 20-50+ years.'
  },

  // New Zealand
  'marlborough': {
    name: 'Marlborough',
    country: 'New Zealand',
    aliases: ['wairau valley', 'awatere valley', 'southern valleys'],
    climate: 'Cool, dry, and sunny with significant diurnal variation. Long, slow ripening season.',
    terroir: 'Alluvial stony soils with excellent drainage. River-deposited gravels over clay subsoil.',
    keyVarieties: ['Sauvignon Blanc', 'Pinot Noir', 'Chardonnay', 'Pinot Gris', 'Riesling'],
    notableProducers: ['Cloudy Bay', 'Craggy Range', 'Dog Point', 'Greywacke', 'Fromm', 'Seresin'],
    averagePriceRange: { min: 12, max: 60 },
    bestVintages: [2022, 2020, 2019, 2018, 2017, 2015, 2014, 2013],
    facts: [
      'Marlborough produces over 75% of New Zealand\'s wine.',
      'The first Sauvignon Blanc was planted in 1973; commercial production began in 1979.',
      'New Zealand Sauvignon Blanc became a global phenomenon in the 1990s.',
      'The Awatere Valley produces more mineral, less tropical expressions.',
      'UV levels in Marlborough are among the highest in the world, intensifying aromas.'
    ],
    pairingTraditions: [
      'Green-lipped mussels',
      'Fresh oysters',
      'Goat cheese salads',
      'Asparagus dishes',
      'Thai and Vietnamese cuisine'
    ],
    servingNotes: 'Serve Sauvignon Blanc at 45-50°F. Most are best consumed within 2-3 years of vintage.',
    cellaring: 'Sauvignon Blanc: 1-4 years. Premium Pinot Noir: 5-12 years. Top Chardonnay: 5-10 years.'
  },

  // Argentina
  'mendoza': {
    name: 'Mendoza',
    country: 'Argentina',
    aliases: ['luján de cuyo', 'uco valley', 'maipú', 'valle de uco'],
    climate: 'High desert at 2,000-5,000 feet elevation. Hot days, cool nights, minimal rainfall, intense sunshine.',
    terroir: 'Alluvial soils from Andes snowmelt. Higher altitude sites on limestone and granite.',
    keyVarieties: ['Malbec', 'Cabernet Sauvignon', 'Bonarda', 'Torrontés', 'Chardonnay'],
    notableProducers: ['Catena Zapata', 'Achaval Ferrer', 'Cheval des Andes', 'Zuccardi', 'Bodega Noemia', 'Viña Cobos'],
    averagePriceRange: { min: 10, max: 250 },
    bestVintages: [2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2010, 2009],
    facts: [
      'Argentina is the world\'s largest Malbec producer—the grape nearly disappeared in France.',
      'Vineyards in Mendoza can reach over 1,500 meters (4,900 feet) altitude.',
      'Irrigation from Andes snowmelt is essential—rainfall averages only 8 inches annually.',
      'The Uco Valley is increasingly recognized for producing Argentina\'s finest wines.',
      'Argentine Malbec has deeper color and softer tannins than French versions.'
    ],
    pairingTraditions: [
      'Asado (traditional Argentine BBQ)',
      'Empanadas',
      'Provoleta (grilled provolone)',
      'Chimichurri-marinated meats',
      'Dulce de leche desserts'
    ],
    servingNotes: 'Serve Malbec at 64-68°F. Minimal decanting needed for fruit-forward styles.',
    cellaring: 'Entry-level Malbec: 3-7 years. Reserve/Single-vineyard: 8-15 years. Top producers: 15-25 years.'
  },
};

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Get region data by name or alias
 */
export function getRegionData(regionName: string): RegionData | undefined {
  const normalized = regionName.toLowerCase().trim();

  // Direct match
  if (wineRegions[normalized]) {
    return wineRegions[normalized];
  }

  // Search by alias
  for (const [key, region] of Object.entries(wineRegions)) {
    if (region.aliases.some(alias => alias.toLowerCase() === normalized)) {
      return region;
    }
  }

  return undefined;
}

/**
 * Get all regions for a country
 */
export function getRegionsByCountry(country: string): RegionData[] {
  return Object.values(wineRegions).filter(
    r => r.country.toLowerCase() === country.toLowerCase()
  );
}

/**
 * Get random facts for a region
 */
export function getRandomFacts(regionName: string, count: number = 2): string[] {
  const region = getRegionData(regionName);
  if (!region) return [];

  const shuffled = [...region.facts].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get a region-specific content block for articles
 */
export function generateRegionBlock(regionName: string): string {
  const region = getRegionData(regionName);
  if (!region) return '';

  const facts = getRandomFacts(regionName, 2);

  return `
## About ${region.name}

${region.terroir}

**Climate:** ${region.climate}

**Key Producers:** ${region.notableProducers.slice(0, 4).join(', ')}

**Did You Know?**
${facts.map(f => `- ${f}`).join('\n')}

**Food Pairing Traditions:**
${region.pairingTraditions.slice(0, 3).map(p => `- ${p}`).join('\n')}

**Serving & Cellaring:** ${region.servingNotes}
  `.trim();
}

/**
 * Detect regions mentioned in content
 */
export function detectRegions(content: string): RegionData[] {
  const detected: RegionData[] = [];
  const contentLower = content.toLowerCase();

  for (const [key, region] of Object.entries(wineRegions)) {
    if (contentLower.includes(key) || region.aliases.some(a => contentLower.includes(a.toLowerCase()))) {
      detected.push(region);
    }
  }

  return detected;
}
