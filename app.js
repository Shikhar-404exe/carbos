/**
 * VayuSense — Atmospheric Intelligence Platform
 * Frontend Application Logic
 *
 * Architecture: Multi-step categorical state capture → clean JSON POST
 * to Google Cloud Function → renders Gemini AI + Google Maps heatmap results.
 *
 * © 2026 VayuSense Platform · Hackathon Edition
 * Powered by Google Cloud, Gemini AI, TROPOMI/Sentinel-5P satellite data
 */

'use strict';

/* ═══════════════════════════════════════════════════════════
   DEMO MODE — set to false when Cloud Function is deployed
   When true: bypasses the real backend and renders mock data
   so the full UI flow is visible without any API keys.
════════════════════════════════════════════════════════════ */
const DEMO_MODE = false;

/**
 * Mock response that mirrors the exact JSON shape returned by
 * functions/main.py (Pydantic ComputeResponse schema).
 * Swap out with real backend data when DEMO_MODE = false.
 */
const MOCK_RESPONSE = {
  baseline_score: 387,
  proximity_km: 142,
  risk_level: 'high',
  nearest_hotspot: {
    id: 'HS004',
    lat: 29.1492,
    lng: 75.7217,
    label: 'Hisar \u2014 Haryana Crop Fire Belt',
    city_region: 'Haryana',
    aqi_index: 312,
    hcho_ppb: 18.9,
    source: 'Wheat & Paddy Residue Combustion',
    satellite: 'VIIRS/Suomi-NPP'
  },
  actions: [
    {
      icon: '\uD83D\uDE8C',
      title: 'Switch to Public Transport 3\xD7/week',
      description: 'At 142 km from the Hisar burning zone, diesel exhaust compounds HCHO formation in your ambient air. Reducing car use during Nov stubble season cuts your personal VOC contribution by ~28% and directly reduces PM2.5 exposure.',
      impact_estimate: '\u221245 kg CO\u2082e/month'
    },
    {
      icon: '\uD83E\uDD57',
      title: 'Adopt Meatless Mondays & Wednesdays',
      description: 'Your omnivore diet generates ~200 kg CO\u2082e/month. With active HCHO plumes reaching AQI 312 nearby, reducing livestock demand also cuts methane \u2014 which reacts with OH radicals in the troposphere to produce secondary HCHO.',
      impact_estimate: '\u221267 kg CO\u2082e/month'
    },
    {
      icon: '\uD83D\uDCA1',
      title: 'LED Retrofit + Smart Power Management',
      description: 'Your 250 kWh/month non-renewable grid usage feeds thermal plant emissions that amplify PM2.5 in HCHO-rich air masses drifting from Punjab. A full LED conversion and standby elimination cuts 35 kWh/month at the source.',
      impact_estimate: '\u221222 kg CO\u2082e/month'
    }
  ],
  session_id: 'demo-session-001'
};

/* ═══════════════════════════════════════════════════════════
   CONFIG
════════════════════════════════════════════════════════════ */

/**
 * Cloud Function endpoint — replace with your deployed function URL.
 * e.g. https://REGION-PROJECT_ID.cloudfunctions.net/compute_footprint
 */
const CLOUD_FUNCTION_URL = 'https://us-central1-scenic-energy-500112-u4.cloudfunctions.net/compute_footprint';

/**
 * Path to the local mock hotspots dataset.
 * Used to initialize the Google Maps HeatmapLayer on the results screen.
 */
const HOTSPOTS_PATH = 'data/mock_hotspots.json';

/* ═══════════════════════════════════════════════════════════
   MULTILINGUAL TRANSLATIONS
   Structural framework preserved from reference architecture.
════════════════════════════════════════════════════════════ */
const translations = {
  en: {
    appTitle:         'VayuSense',
    changeLangBtn:    '🌐 Language',
    tabPersonal:      '👤 Personal',
    tabTravel:        '🚗 Travel',
    tabWaste:         '♻️ Waste',
    tabEnergy:        '⚡ Energy',
    tabConsumption:   '🌿 Consumption',
    labelCity:        '📍 Your City',
    labelHeight:      'Height (cm)',
    labelWeight:      'Weight (kg)',
    labelGender:      'Gender',
    labelDiet:        'Diet',
    labelSocial:      'Social Activity',
    genderMale:       'Male',
    genderFemale:     'Female',
    genderOther:      'Other',
    dietOmnivore:     'Omnivore',
    dietVegetarian:   'Vegetarian',
    dietVegan:        'Vegan',
    socialNever:      'Never',
    socialSometimes:  'Sometimes',
    socialOften:      'Often',
    labelTransport:   'Transportation Type',
    transportCar:     'Car',
    transportMotorcycle: 'Motorcycle',
    transportPublic:  'Public Transport',
    transportBicycle: 'Bicycle',
    transportWalk:    'Walk',
    labelDistance:    'Monthly Distance Traveled (km):',
    labelFlights:     'Flight Frequency Last Month',
    flightsNever:     'Never',
    flightsOnce:      'Once',
    flightsTwice:     'Twice',
    flightsOften:     'Often (3+)',
    labelWasteAmount: 'Waste Produced per Week (kg):',
    labelRecycling:   'Recycling Habits',
    recyclingNone:    'None',
    recyclingPartial: 'Partial',
    recyclingAlways:  'Always',
    labelComposting:  'Composting',
    labelElectricity: 'Monthly Electricity Usage (kWh)',
    labelRenewable:   'Renewable Energy Source',
    labelHousehold:   'Number of People in Household',
    labelHeating:     'Heating / Cooling Source',
    heatingGas:       'Natural Gas / LPG',
    heatingOil:       'Kerosene / Oil',
    heatingElectric:  'Electric',
    heatingHeatPump:  'Inverter AC / Heat Pump',
    labelClothes:     'New Clothes Bought Monthly:',
    labelElectronics: 'Electronic Devices Purchased Yearly:',
    labelFoodWaste:   'Food Waste per Week (kg):',
    submitInfoTitle:  'Ready to Analyze',
    submitInfoSub:    'Gemini AI · HCHO Plumes · Proximity Risk',
    calculateBtn:     '✨ Analyze with Gemini AI',
    resultsTitle:     '🌍 Your Atmospheric Risk Profile',
    labelBaselineScore: 'Baseline Score',
    labelProximity:   'Nearest Hotspot',
    labelRiskLevel:   'Risk Level',
    geminiActionsTitle:    'Hyper-Personalized Micro-Actions',
    geminiActionsSubtitle: 'Based on your carbon profile and proximity to active HCHO plumes over India',
    backBtn:          '← Back to Editor',
    factBtn:          '💡 Did You Know?',
    modalOkBtn:       'OK',
    items:            'items',
    devices:          'devices',
    loadingStep1:     'Computing baseline score',
    loadingStep2:     'Parsing HCHO hotspots',
    loadingStep3:     'Querying Gemini 1.5 Flash',
    errorTitle:       '⚠️ Analysis Failed',
    errorBody:        'Could not reach the VayuSense backend. Check your Cloud Function URL and try again.',
  },
  ar: {
    appTitle:         'VayuSense',
    changeLangBtn:    '🌐 اللغة',
    tabPersonal:      '👤 شخصي',
    tabTravel:        '🚗 السفر',
    tabWaste:         '♻️ النفايات',
    tabEnergy:        '⚡ الطاقة',
    tabConsumption:   '🌿 الاستهلاك',
    labelCity:        '📍 مدينتك',
    labelHeight:      'الطول (سم)',
    labelWeight:      'الوزن (كجم)',
    labelGender:      'الجنس',
    labelDiet:        'النظام الغذائي',
    labelSocial:      'النشاط الاجتماعي',
    genderMale:       'ذكر',
    genderFemale:     'أنثى',
    genderOther:      'آخر',
    dietOmnivore:     'متنوع',
    dietVegetarian:   'نباتي',
    dietVegan:        'نباتي صرف',
    socialNever:      'أبداً',
    socialSometimes:  'أحياناً',
    socialOften:      'غالباً',
    labelTransport:   'نوع النقل',
    transportCar:     'سيارة',
    transportMotorcycle: 'دراجة نارية',
    transportPublic:  'نقل عام',
    transportBicycle: 'دراجة',
    transportWalk:    'مشي',
    labelDistance:    'المسافة الشهرية المقطوعة (كم):',
    labelFlights:     'تكرار الرحلات الجوية الشهر الماضي',
    flightsNever:     'أبداً',
    flightsOnce:      'مرة',
    flightsTwice:     'مرتين',
    flightsOften:     'غالباً (3+)',
    labelWasteAmount: 'النفايات المنتجة أسبوعياً (كجم):',
    labelRecycling:   'عادات إعادة التدوير',
    recyclingNone:    'لا شيء',
    recyclingPartial: 'جزئي',
    recyclingAlways:  'دائماً',
    labelComposting:  'التسميد',
    labelElectricity: 'استهلاك الكهرباء الشهري (كيلوواط ساعة)',
    labelRenewable:   'مصدر طاقة متجددة',
    labelHousehold:   'عدد الأشخاص في الأسرة',
    labelHeating:     'مصدر التدفئة / التبريد',
    heatingGas:       'غاز طبيعي / غاز البترول',
    heatingOil:       'كيروسين / زيت',
    heatingElectric:  'كهربائي',
    heatingHeatPump:  'مكيف إنفرتر / مضخة حرارية',
    labelClothes:     'الملابس الجديدة المشتراة شهرياً:',
    labelElectronics: 'الأجهزة الإلكترونية المشتراة سنوياً:',
    labelFoodWaste:   'هدر الطعام أسبوعياً (كجم):',
    submitInfoTitle:  'جاهز للتحليل',
    submitInfoSub:    'جيميني AI · بيانات HCHO · مخاطر القرب',
    calculateBtn:     '✨ تحليل مع جيميني AI',
    resultsTitle:     '🌍 ملف مخاطرك الجوية',
    labelBaselineScore: 'النتيجة الأساسية',
    labelProximity:   'أقرب بؤرة ساخنة',
    labelRiskLevel:   'مستوى المخاطر',
    geminiActionsTitle:    'إجراءات مخصصة فائقة',
    geminiActionsSubtitle: 'بناءً على ملفك الكربوني وقربك من مناطق HCHO النشطة فوق الهند',
    backBtn:          '← العودة للمحرر',
    factBtn:          '💡 هل تعلم؟',
    modalOkBtn:       'حسناً',
    items:            'عناصر',
    devices:          'أجهزة',
    loadingStep1:     'حساب النتيجة الأساسية',
    loadingStep2:     'تحليل بيانات HCHO',
    loadingStep3:     'استعلام جيميني 1.5 Flash',
    errorTitle:       '⚠️ فشل التحليل',
    errorBody:        'تعذر الوصول إلى الخادم. تحقق من عنوان URL للوظيفة وحاول مرة أخرى.',
  },
  fr: {
    appTitle:         'VayuSense',
    changeLangBtn:    '🌐 Langue',
    tabPersonal:      '👤 Personnel',
    tabTravel:        '🚗 Voyage',
    tabWaste:         '♻️ Déchets',
    tabEnergy:        '⚡ Énergie',
    tabConsumption:   '🌿 Consommation',
    labelCity:        '📍 Votre Ville',
    labelHeight:      'Taille (cm)',
    labelWeight:      'Poids (kg)',
    labelGender:      'Genre',
    labelDiet:        'Régime',
    labelSocial:      'Activité Sociale',
    genderMale:       'Homme',
    genderFemale:     'Femme',
    genderOther:      'Autre',
    dietOmnivore:     'Omnivore',
    dietVegetarian:   'Végétarien',
    dietVegan:        'Végétalien',
    socialNever:      'Jamais',
    socialSometimes:  'Parfois',
    socialOften:      'Souvent',
    labelTransport:   'Type de Transport',
    transportCar:     'Voiture',
    transportMotorcycle: 'Moto',
    transportPublic:  'Transport Public',
    transportBicycle: 'Vélo',
    transportWalk:    'Marche',
    labelDistance:    'Distance Mensuelle Parcourue (km):',
    labelFlights:     'Fréquence des Vols le Mois Dernier',
    flightsNever:     'Jamais',
    flightsOnce:      'Une fois',
    flightsTwice:     'Deux fois',
    flightsOften:     'Souvent (3+)',
    labelWasteAmount: 'Déchets Produits par Semaine (kg):',
    labelRecycling:   'Habitudes de Recyclage',
    recyclingNone:    'Aucun',
    recyclingPartial: 'Partiel',
    recyclingAlways:  'Toujours',
    labelComposting:  'Compostage',
    labelElectricity: 'Consommation Mensuelle d\'Électricité (kWh)',
    labelRenewable:   'Source d\'Énergie Renouvelable',
    labelHousehold:   'Nombre de Personnes dans le Ménage',
    labelHeating:     'Source de Chauffage / Climatisation',
    heatingGas:       'Gaz Naturel / GPL',
    heatingOil:       'Kérosène / Fioul',
    heatingElectric:  'Électrique',
    heatingHeatPump:  'Climatiseur Inverseur / Pompe à Chaleur',
    labelClothes:     'Nouveaux Vêtements Achetés Mensuellement:',
    labelElectronics: 'Appareils Électroniques Achetés Annuellement:',
    labelFoodWaste:   'Gaspillage Alimentaire par Semaine (kg):',
    submitInfoTitle:  'Prêt à Analyser',
    submitInfoSub:    'Gemini AI · Panaches HCHO · Risque de Proximité',
    calculateBtn:     '✨ Analyser avec Gemini AI',
    resultsTitle:     '🌍 Votre Profil de Risque Atmosphérique',
    labelBaselineScore: 'Score de Base',
    labelProximity:   'Point Chaud le Plus Proche',
    labelRiskLevel:   'Niveau de Risque',
    geminiActionsTitle:    'Micro-Actions Hyper-Personnalisées',
    geminiActionsSubtitle: 'Basées sur votre profil carbone et votre proximité aux panaches HCHO actifs',
    backBtn:          '← Retour à l\'Éditeur',
    factBtn:          '💡 Le Saviez-vous?',
    modalOkBtn:       'OK',
    items:            'articles',
    devices:          'appareils',
    loadingStep1:     'Calcul du score de base',
    loadingStep2:     'Analyse des points chauds HCHO',
    loadingStep3:     'Interrogation de Gemini 1.5 Flash',
    errorTitle:       '⚠️ Analyse Échouée',
    errorBody:        'Impossible d\'atteindre le backend VayuSense. Vérifiez votre URL.',
  },
  de: {
    appTitle:         'VayuSense',
    changeLangBtn:    '🌐 Sprache',
    tabPersonal:      '👤 Persönlich',
    tabTravel:        '🚗 Reisen',
    tabWaste:         '♻️ Abfall',
    tabEnergy:        '⚡ Energie',
    tabConsumption:   '🌿 Konsum',
    labelCity:        '📍 Ihre Stadt',
    labelHeight:      'Größe (cm)',
    labelWeight:      'Gewicht (kg)',
    labelGender:      'Geschlecht',
    labelDiet:        'Ernährung',
    labelSocial:      'Soziale Aktivität',
    genderMale:       'Männlich',
    genderFemale:     'Weiblich',
    genderOther:      'Andere',
    dietOmnivore:     'Allesfresser',
    dietVegetarian:   'Vegetarisch',
    dietVegan:        'Vegan',
    socialNever:      'Nie',
    socialSometimes:  'Manchmal',
    socialOften:      'Oft',
    labelTransport:   'Transportart',
    transportCar:     'Auto',
    transportMotorcycle: 'Motorrad',
    transportPublic:  'Öffentliche Verkehrsmittel',
    transportBicycle: 'Fahrrad',
    transportWalk:    'Zu Fuß',
    labelDistance:    'Monatlich Zurückgelegte Entfernung (km):',
    labelFlights:     'Flughäufigkeit im Letzten Monat',
    flightsNever:     'Nie',
    flightsOnce:      'Einmal',
    flightsTwice:     'Zweimal',
    flightsOften:     'Oft (3+)',
    labelWasteAmount: 'Produzierter Abfall pro Woche (kg):',
    labelRecycling:   'Recycling-Gewohnheiten',
    recyclingNone:    'Keine',
    recyclingPartial: 'Teilweise',
    recyclingAlways:  'Immer',
    labelComposting:  'Kompostierung',
    labelElectricity: 'Monatlicher Stromverbrauch (kWh)',
    labelRenewable:   'Erneuerbare Energiequelle',
    labelHousehold:   'Anzahl der Personen im Haushalt',
    labelHeating:     'Heizungs- / Kühlungsquelle',
    heatingGas:       'Erdgas / Flüssiggas',
    heatingOil:       'Kerosin / Öl',
    heatingElectric:  'Elektrisch',
    heatingHeatPump:  'Inverter-Klimaanlage / Wärmepumpe',
    labelClothes:     'Monatlich Gekaufte Neue Kleidung:',
    labelElectronics: 'Jährlich Gekaufte Elektronische Geräte:',
    labelFoodWaste:   'Lebensmittelverschwendung pro Woche (kg):',
    submitInfoTitle:  'Bereit zur Analyse',
    submitInfoSub:    'Gemini AI · HCHO-Fahnen · Näherisiko',
    calculateBtn:     '✨ Mit Gemini AI Analysieren',
    resultsTitle:     '🌍 Ihr Atmosphärisches Risikoprofil',
    labelBaselineScore: 'Basisscore',
    labelProximity:   'Nächster Hotspot',
    labelRiskLevel:   'Risikoniveau',
    geminiActionsTitle:    'Hyper-Personalisierte Mikro-Aktionen',
    geminiActionsSubtitle: 'Basierend auf Ihrem CO₂-Profil und Ihrer Nähe zu aktiven HCHO-Fahnen',
    backBtn:          '← Zurück zum Editor',
    factBtn:          '💡 Wussten Sie?',
    modalOkBtn:       'OK',
    items:            'Artikel',
    devices:          'Geräte',
    loadingStep1:     'Basisscore berechnen',
    loadingStep2:     'HCHO-Hotspots analysieren',
    loadingStep3:     'Gemini 1.5 Flash abfragen',
    errorTitle:       '⚠️ Analyse Fehlgeschlagen',
    errorBody:        'VayuSense-Backend nicht erreichbar. Überprüfen Sie Ihre Cloud Function URL.',
  }
};

/* ═══════════════════════════════════════════════════════════
   SUSTAINABILITY FACTS (retained from reference architecture)
════════════════════════════════════════════════════════════ */
const sustainabilityFacts = [
  '🌾 Punjab & Haryana stubble burning contributes up to 46% of Delhi\'s PM2.5 in November.',
  '🛰️ Sentinel-5P/TROPOMI detects HCHO columns from agricultural burning with 3.5×5.5 km resolution.',
  '🌿 One tree absorbs about 20 kg of CO₂ per year — India planted 1.4 billion in 2023.',
  '🚗 Switching from a petrol car to EV in India cuts lifecycle emissions by ~50% using current grid mix.',
  '🌊 The Indian Ocean is warming 3× faster than the global average, intensifying monsoons.',
  '☀️ India reached 73 GW of solar capacity in 2024 — 3rd largest in the world.',
  '🥗 Shifting to a plant-based diet saves 1.5 tonnes of CO₂e per person per year.',
  '🔥 Agricultural fires in India release ~91 million tonnes of CO₂e annually during Oct–Nov.',
  '🌫️ HCHO (formaldehyde) from biomass burning can persist in the atmosphere for up to 4 days.',
  '🏭 India\'s per-capita carbon footprint is 1.9 t CO₂e/year — 4× lower than the USA.',
  '♻️ Composting diverts organic waste from landfills, cutting methane emissions by up to 99%.',
  '💡 LED bulbs use 80% less energy than incandescent bulbs and last 25× longer.',
  '✈️ One long-haul flight generates more CO₂ than 6 months of average Indian car use.',
  '🌬️ Volatile Organic Compounds (VOCs) from burning react with NOₓ to form ground-level ozone.',
  '🌱 ISRO\'s Cartosat-3 and ResourceSat-2 satellites monitor crop residue burning across India.',
];

/* ═══════════════════════════════════════════════════════════
   STATE
════════════════════════════════════════════════════════════ */
let currentLanguage = 'en';
let currentTab = 'personal';
let mapInstance = null;
let heatmapLayer = null;
let hotspotsCache = null;  // Cached hotspot GeoJSON after first fetch

/* ═══════════════════════════════════════════════════════════
   LANGUAGE FRAMEWORK
   (Structural pattern from reference architecture — preserved)
════════════════════════════════════════════════════════════ */

/**
 * Called by language screen buttons. Sets language, flips RTL for Arabic,
 * updates all UI text, and navigates to the main form screen.
 */
function selectLanguage(lang) {
  currentLanguage = lang;
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  updateLanguage();
  showScreen('mainScreen');
}

/**
 * Applies the current language translations to all static UI text nodes.
 */
function updateLanguage() {
  const t = translations[currentLanguage];

  // Header & navigation
  safeSet('appTitle', t.appTitle);
  safeSet('changeLangBtn', t.changeLangBtn);

  // Tab buttons
  safeHTML('tabPersonal',    t.tabPersonal);
  safeHTML('tabTravel',      t.tabTravel);
  safeHTML('tabWaste',       t.tabWaste);
  safeHTML('tabEnergy',      t.tabEnergy);
  safeHTML('tabConsumption', t.tabConsumption);

  // Personal tab labels
  safeSet('labelCity',   t.labelCity);
  safeSet('labelGender', t.labelGender);
  safeSet('labelSocial', t.labelSocial);
  safeFirstChild('labelHeight', t.labelHeight);
  safeFirstChild('labelDiet',   t.labelDiet);
  safeFirstChild('labelWeight', t.labelWeight);

  updateSelectOptions('gender', ['male','female','other'], [t.genderMale, t.genderFemale, t.genderOther]);
  updateSelectOptions('diet',   ['omnivore','vegetarian','vegan'], [t.dietOmnivore, t.dietVegetarian, t.dietVegan]);
  updateSelectOptions('social', ['never','sometimes','often'], [t.socialNever, t.socialSometimes, t.socialOften]);

  // Travel tab labels
  safeFirstChild('labelTransport', t.labelTransport);
  safeFirstChild('labelFlights',   t.labelFlights);
  safeFirstChild('labelDistance',  t.labelDistance + ' ');
  updateSelectOptions('transport', ['car','motorcycle','public','bicycle','walk'],
    [t.transportCar, t.transportMotorcycle, t.transportPublic, t.transportBicycle, t.transportWalk]);
  updateSelectOptions('flights', ['never','once','twice','often'],
    [t.flightsNever, t.flightsOnce, t.flightsTwice, t.flightsOften]);

  // Waste tab labels
  safeFirstChild('labelWasteAmount', t.labelWasteAmount + ' ');
  safeFirstChild('labelRecycling',   t.labelRecycling);
  safeSet('labelComposting', t.labelComposting);
  updateSelectOptions('recycling', ['none','partial','always'],
    [t.recyclingNone, t.recyclingPartial, t.recyclingAlways]);

  // Energy tab labels
  safeFirstChild('labelElectricity', t.labelElectricity);
  safeSet('labelRenewable',  t.labelRenewable);
  safeSet('labelHousehold',  t.labelHousehold);
  safeSet('labelHeating',    t.labelHeating);
  updateSelectOptions('heating', ['gas','oil','electric','heatpump'],
    [t.heatingGas, t.heatingOil, t.heatingElectric, t.heatingHeatPump]);

  // Consumption tab labels
  safeFirstChild('labelClothes',    t.labelClothes + ' ');
  safeFirstChild('labelElectronics', t.labelElectronics + ' ');
  safeFirstChild('labelFoodWaste',  t.labelFoodWaste + ' ');

  // Submit panel
  safeSet('submitInfoTitle', t.submitInfoTitle);
  safeSet('submitInfoSub',   t.submitInfoSub);
  safeHTML('calculateBtn',   t.calculateBtn);

  // Results screen
  safeSet('resultsTitle',          t.resultsTitle);
  safeSet('labelBaselineScore',    t.labelBaselineScore);
  safeSet('labelProximity',        t.labelProximity);
  safeSet('labelRiskLevel',        t.labelRiskLevel);
  safeSet('geminiActionsTitle',    t.geminiActionsTitle);
  safeSet('geminiActionsSubtitle', t.geminiActionsSubtitle);
  safeSet('backBtn',     t.backBtn);
  safeSet('factBtn',     t.factBtn);
  safeSet('modalOkBtn',  t.modalOkBtn);
}

function updateSelectOptions(selectId, values, labels) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const currentValue = select.value;
  select.innerHTML = '';
  values.forEach((value, index) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = labels[index];
    if (value === currentValue) option.selected = true;
    select.appendChild(option);
  });
}

/* Helpers to safely update DOM text without breaking child nodes */
function safeSet(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function safeHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function safeFirstChild(id, text) {
  const el = document.getElementById(id);
  if (el && el.childNodes[0]) el.childNodes[0].textContent = text;
}

/* ═══════════════════════════════════════════════════════════
   SCREEN & TAB NAVIGATION
   (Structural pattern from reference architecture — preserved)
════════════════════════════════════════════════════════════ */

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');
}

function showLanguageScreen() {
  showScreen('languageScreen');
}

function showTab(tabName) {
  currentTab = tabName;

  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  const tabBtn = document.getElementById('tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
  if (tabBtn) {
    tabBtn.classList.add('active');
    tabBtn.setAttribute('aria-selected', 'true');
  }
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn !== tabBtn) btn.setAttribute('aria-selected', 'false');
  });

  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const content = document.getElementById(tabName + 'Tab');
  if (content) content.classList.add('active');
}

/**
 * Updates range slider display value spans.
 * e.g. updateSlider('distance') → sets #distanceValue to current slider value
 */
function updateSlider(sliderId) {
  const slider = document.getElementById(sliderId);
  const valueSpan = document.getElementById(sliderId + 'Value');
  if (slider && valueSpan) valueSpan.textContent = slider.value;
}

function backToEditor() {
  showScreen('mainScreen');
}

/* ═══════════════════════════════════════════════════════════
   CATEGORICAL STATE CAPTURE
   Reads all 5 tabs into a single clean JSON object.
   This replaces the old client-side calculate() function.
════════════════════════════════════════════════════════════ */

/**
 * collectFormState()
 * Traverses all 5 categorical form tabs and returns a unified
 * payload object ready for dispatch to the Cloud Function.
 *
 * @returns {Object} Raw user inputs — no calculations performed here.
 */
function collectFormState() {
  return {
    personal: {
      city:   getVal('city')   || 'Delhi',
      height: getNum('height') || 170,
      weight: getNum('weight') || 70,
      gender: getVal('gender') || 'male',
      diet:   getVal('diet')   || 'omnivore',
      social: getVal('social') || 'sometimes',
    },
    travel: {
      transport:   getVal('transport')    || 'car',
      distance_km: getNum('distance')     || 1000,
      flights:     getVal('flights')      || 'never',
    },
    waste: {
      waste_kg_week: getNum('wasteAmount') || 10,
      recycling:     getVal('recycling')   || 'partial',
      composting:    getChecked('composting'),
    },
    energy: {
      electricity_kwh: getNum('electricity')  || 250,
      renewable:       getChecked('renewable'),
      household_size:  getNum('household')    || 2,
      heating:         getVal('heating')      || 'gas',
    },
    consumption: {
      clothes_monthly:   getNum('clothes')    || 2,
      electronics_yearly:getNum('electronics')|| 1,
      food_waste_kg_week:getNum('foodWaste')  || 2,
    },
    metadata: {
      language:   currentLanguage,
      submitted_at: new Date().toISOString(),
      client:     'vayusense-web-v1',
    }
  };
}

/* DOM value helpers */
function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value : null;
}

function getNum(id) {
  const el = document.getElementById(id);
  return el ? (parseFloat(el.value) || 0) : 0;
}

function getChecked(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}

/* ═══════════════════════════════════════════════════════════
   SUBMIT HANDLER
════════════════════════════════════════════════════════════ */

/**
 * handleSubmit()
 * Triggered by the "Analyze with Gemini AI" button.
 * 1. Collects form state
 * 2. Shows results screen in loading state
 * 3. Dispatches POST to Cloud Function
 * 4. Renders results or shows error modal
 */
async function handleSubmit() {
  const payload = collectFormState();

  // Switch to results screen and show loading overlay
  showScreen('resultsScreen');
  showLoadingState();

  try {
    await submitToBackend(payload);
  } catch (err) {
    console.error('[VayuSense] Backend error:', err);
    hideLoadingState();
    const t = translations[currentLanguage];
    showModal(t.errorTitle + '\n\n' + t.errorBody + '\n\n' + err.message);
    // Fall back to editor on modal close
    document.getElementById('modal').addEventListener('click', backToEditor, { once: true });
  }
}

/**
 * submitToBackend(payload)
 * Dispatches the raw JSON payload to the Google Cloud Function endpoint.
 * Animates loading steps, then calls renderGeminiResults() on success.
 *
 * @param {Object} payload - The collectFormState() output
 */
async function submitToBackend(payload) {
  // Animate loading steps (same timing regardless of demo/live mode)
  await animateLoadingStep('step1', 700);
  await animateLoadingStep('step2', 1000);
  await animateLoadingStep('step3', 600);

  let data;

  if (DEMO_MODE) {
    // ── DEMO MODE: simulate network latency, return mock data ──
    console.info('[VayuSense] DEMO_MODE active \u2014 using mock response. Set DEMO_MODE=false for production.');
    await new Promise(resolve => setTimeout(resolve, 400)); // simulated latency
    data = MOCK_RESPONSE;
  } else {
    // ── PRODUCTION MODE: dispatch to Google Cloud Function ──
    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    data = await response.json();

    if (!data || typeof data.baseline_score === 'undefined') {
      throw new Error('Invalid response structure from Cloud Function.');
    }
  }

  await renderGeminiResults(data, payload.personal.city);
}

/**
 * animateLoadingStep(stepId, delayMs)
 * Marks a loading step as "active" then "done" with a delay.
 */
function animateLoadingStep(stepId, delayMs) {
  return new Promise(resolve => {
    const el = document.getElementById(stepId);
    if (el) {
      el.classList.add('active');
      el.textContent = '🔄 ' + el.textContent.replace(/^[^ ]+ /, '');
    }
    setTimeout(() => {
      if (el) {
        el.classList.remove('active');
        el.classList.add('done');
        el.textContent = '✅ ' + el.textContent.replace(/^[^ ]+ /, '');
      }
      resolve();
    }, delayMs);
  });
}

/* ═══════════════════════════════════════════════════════════
   RESULTS RENDERER
════════════════════════════════════════════════════════════ */

/**
 * renderGeminiResults(data, city)
 * Populates all results UI components from the Cloud Function JSON response.
 *
 * Expected data shape (from functions/schema.py ComputeResponse):
 * {
 *   baseline_score: number,      // kg CO2e/month
 *   proximity_km: number,        // distance to nearest hotspot
 *   risk_level: string,          // "low" | "moderate" | "high" | "critical"
 *   nearest_hotspot: {           // hotspot object
 *     label, aqi_index, hcho_ppb, source, city_region
 *   },
 *   actions: [                   // exactly 3 items from Gemini
 *     { icon, title, description, impact_estimate }
 *   ]
 * }
 */
async function renderGeminiResults(data, city) {
  // 1. Populate score cards
  const scoreEl = document.getElementById('baselineScore');
  const proxEl  = document.getElementById('proximityKm');
  const riskEl  = document.getElementById('riskBadge');
  const hchoEl  = document.getElementById('riskHchoLabel');

  if (scoreEl) scoreEl.textContent = Math.round(data.baseline_score).toLocaleString();
  if (proxEl)  proxEl.textContent  = Math.round(data.proximity_km).toLocaleString();

  // 2. Risk badge
  if (riskEl) {
    const level = (data.risk_level || 'moderate').toLowerCase();
    riskEl.textContent  = level.charAt(0).toUpperCase() + level.slice(1);
    riskEl.className    = 'risk-badge risk-' + level;
  }

  // 3. HCHO ppb from nearest hotspot
  if (hchoEl && data.nearest_hotspot) {
    hchoEl.textContent = `HCHO: ${data.nearest_hotspot.hcho_ppb} ppb · AQI: ${data.nearest_hotspot.aqi_index}`;
  }

  // 4. Hotspot detail card
  renderHotspotDetail(data.nearest_hotspot);

  // 5. Gemini action tiles
  renderActionTiles(data.actions || []);

  // 6. Reveal results content
  hideLoadingState();
  const resultsContent = document.getElementById('resultsContent');
  if (resultsContent) resultsContent.style.display = 'block';

  // 7. Re-center Google Map on the user's nearest hotspot (if map is ready)
  if (mapInstance && data.nearest_hotspot) {
    mapInstance.panTo({
      lat: data.nearest_hotspot.lat || 28.6139,
      lng: data.nearest_hotspot.lng || 77.2090
    });
    mapInstance.setZoom(7);
  }
}

/**
 * renderHotspotDetail(hotspot)
 * Populates the nearest hotspot detail grid card.
 */
function renderHotspotDetail(hotspot) {
  const grid = document.getElementById('hotspotDetailGrid');
  if (!grid || !hotspot) return;

  const stats = [
    { label: 'Location',  value: hotspot.label || '—' },
    { label: 'Region',    value: hotspot.city_region || '—' },
    { label: 'HCHO',      value: `${hotspot.hcho_ppb || '—'} ppb` },
    { label: 'AQI Index', value: hotspot.aqi_index || '—' },
    { label: 'Source',    value: hotspot.source || '—' },
    { label: 'Satellite', value: hotspot.satellite || 'TROPOMI/Sentinel-5P' },
  ];

  grid.innerHTML = stats.map(s => `
    <div class="hotspot-stat">
      <div class="hotspot-stat-label">${s.label}</div>
      <div class="hotspot-stat-value">${s.value}</div>
    </div>
  `).join('');
}

/**
 * renderActionTiles(actions)
 * Populates the 3-tile Gemini AI actions grid.
 * Each action: { icon, title, description, impact_estimate }
 */
function renderActionTiles(actions) {
  const grid = document.getElementById('actionsGrid');
  if (!grid) return;

  if (!actions || actions.length === 0) {
    grid.innerHTML = `
      <div class="action-tile" style="grid-column:1/-1; text-align:center; padding:2rem; color:#9ca3af;">
        No actions returned. Check backend response.
      </div>`;
    return;
  }

  grid.innerHTML = actions.map((action, i) => `
    <div class="action-tile">
      <div class="action-tile-number">Action ${i + 1}</div>
      <span class="action-tile-icon">${escapeHTML(action.icon || '🌱')}</span>
      <div class="action-tile-title">${escapeHTML(action.title || '')}</div>
      <div class="action-tile-desc">${escapeHTML(action.description || '')}</div>
      ${action.impact_estimate
        ? `<span class="action-tile-impact">📊 ${escapeHTML(action.impact_estimate)}</span>`
        : ''}
    </div>
  `).join('');
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/* ═══════════════════════════════════════════════════════════
   LOADING STATE HELPERS
════════════════════════════════════════════════════════════ */

function showLoadingState() {
  const overlay  = document.getElementById('loadingOverlay');
  const content  = document.getElementById('resultsContent');
  if (overlay) overlay.style.display = 'flex';
  if (content) content.style.display = 'none';

  // Reset step indicators
  const t = translations[currentLanguage];
  resetStep('step1', t.loadingStep1);
  resetStep('step2', t.loadingStep2);
  resetStep('step3', t.loadingStep3);
}

function hideLoadingState() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'none';
}

function resetStep(id, label) {
  const el = document.getElementById(id);
  if (el) {
    el.className = 'step';
    el.textContent = '⬜ ' + label;
  }
}

/* ═══════════════════════════════════════════════════════════
   GOOGLE MAPS — HEATMAP INTEGRATION
════════════════════════════════════════════════════════════ */

/**
 * initMap()
 * Google Maps JavaScript API callback (registered via ?callback=initMap).
 * Initializes a dark satellite map centered on India.
 * Immediately loads the HCHO heatmap layer from mock_hotspots.json.
 */
/**
 * mapsLoadError()
 * Called if the Google Maps script fails (e.g., no API key).
 * Shows a styled placeholder in the heatmap container.
 */
function mapsLoadError() {
  const container = document.getElementById('heatmap-container');
  if (!container) return;
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.flexDirection = 'column';
  container.style.gap = '12px';
  container.style.background = 'linear-gradient(135deg, #0d1520, #060b10)';
  container.style.color = '#9ca3af';
  container.style.fontSize = '14px';
  container.style.fontFamily = 'Inter, sans-serif';
  container.innerHTML = `
    <div style="font-size:48px">\uD83D\uDDFA\uFE0F</div>
    <div style="color:#22d3ee;font-weight:600;font-size:16px">Google Maps API Key Required</div>
    <div style="text-align:center;max-width:340px;line-height:1.6">
      Replace <code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px">YOUR_MAPS_API_KEY</code>
      in <strong>index.html</strong> with your Maps JavaScript API key
      to enable the HCHO atmospheric heatmap overlay.
    </div>
    <div style="font-size:12px;color:#4b5563;margin-top:8px">
      Enable: Maps JavaScript API + Visualization library
    </div>
  `;
  console.warn('[VayuSense] Google Maps failed to load. Add a valid Maps API key to index.html.');
}

function initMap() {
  const indiaCenter = { lat: 22.9734, lng: 78.6569 };

  try {
  mapInstance = new google.maps.Map(document.getElementById('heatmap-container'), {
    zoom: 5,
    center: indiaCenter,
    mapTypeId: google.maps.MapTypeId.SATELLITE,
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    styles: [
      { elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
      { featureType: 'administrative.country', elementType: 'geometry.stroke',
        stylers: [{ color: '#22d3ee' }, { weight: 1.5 }] },
      { featureType: 'administrative.province', elementType: 'geometry.stroke',
        stylers: [{ color: '#0891b2' }, { weight: 0.8 }] },
    ]
  });

  // Load and apply heatmap data
  initHeatmap(mapInstance);
  } catch (err) {
    console.error('[VayuSense] Maps init error:', err);
    mapsLoadError();
  }
}

/**
 * initHeatmap(map)
 * Fetches mock_hotspots.json and creates a google.maps.visualization.HeatmapLayer.
 * Uses HCHO `weight` field to scale intensity.
 * Caches fetched data in hotspotsCache to avoid re-fetching.
 *
 * @param {google.maps.Map} map - The initialized map instance
 */
async function initHeatmap(map) {
  try {
    // Use cached data if available
    if (!hotspotsCache) {
      const response = await fetch(HOTSPOTS_PATH);
      if (!response.ok) throw new Error(`Failed to fetch hotspots: HTTP ${response.status}`);
      hotspotsCache = await response.json();
    }

    // Build weighted LatLng array for the HeatmapLayer
    const heatmapData = hotspotsCache.map(hotspot => ({
      location: new google.maps.LatLng(hotspot.lat, hotspot.lng),
      weight: hotspot.weight * 50   // High scale for absolute visibility
    }));

    heatmapLayer = new google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      map: map,
      radius: 120, // Massive radius to ensure visibility at country scale
      opacity: 1,
      // Removed maxIntensity to let Maps auto-scale the heat based on the points
      // HCHO/VOC atmospheric gradient: cyan → blue → purple → red
      gradient: [
        'rgba(0, 255, 255, 0)',
        'rgba(0, 255, 255, 0.4)',
        'rgba(0, 191, 255, 0.6)',
        'rgba(0, 127, 255, 0.75)',
        'rgba(0, 63, 255, 0.85)',
        'rgba(0, 0, 255, 0.9)',
        'rgba(63, 0, 220, 0.92)',
        'rgba(127, 0, 180, 0.94)',
        'rgba(180, 0, 120, 0.96)',
        'rgba(220, 0, 60, 0.98)',
        'rgba(255, 0, 0, 1)'
      ]
    });

    // Add info window on hotspot click using invisible markers
    hotspotsCache.forEach(hotspot => {
      const marker = new google.maps.Marker({
        position: { lat: hotspot.lat, lng: hotspot.lng },
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: '#22d3ee',
          fillOpacity: 0.7,
          strokeColor: '#06b6d4',
          strokeWeight: 1.5,
        },
        title: hotspot.label,
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="font-family:Inter,sans-serif;font-size:13px;max-width:220px;color:#111">
            <strong style="color:#0891b2">${hotspot.label}</strong><br>
            <span style="color:#6b7280;font-size:11px">${hotspot.source}</span><br><br>
            🌫️ HCHO: <strong>${hotspot.hcho_ppb} ppb</strong><br>
            💨 AQI: <strong>${hotspot.aqi_index}</strong><br>
            📡 ${hotspot.satellite}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
    });

  } catch (err) {
    console.warn('[VayuSense] Heatmap init failed:', err.message);
    // Non-fatal — map will still render, just without heatmap overlay
  }
}

/* ═══════════════════════════════════════════════════════════
   MODAL SYSTEM
════════════════════════════════════════════════════════════ */

function showFact() {
  const randomFact = sustainabilityFacts[Math.floor(Math.random() * sustainabilityFacts.length)];
  showModal('💡 ' + randomFact);
}

function showModal(message) {
  const modalText = document.getElementById('modalText');
  if (modalText) modalText.textContent = message;
  const modal = document.getElementById('modal');
  if (modal) modal.classList.add('active');
}

function closeModal() {
  const modal = document.getElementById('modal');
  if (modal) modal.classList.remove('active');
}

/* ═══════════════════════════════════════════════════════════
   INITIALIZATION
════════════════════════════════════════════════════════════ */

window.addEventListener('load', () => {
  // Auto-detect language and skip language screen if supported
  const lang = (navigator.language || navigator.userLanguage || 'en').slice(0, 2).toLowerCase();
  if (['en', 'fr', 'de', 'ar'].includes(lang)) {
    selectLanguage(lang);
  } else {
    selectLanguage('en');
  }

  // Initialize all slider display values
  ['distance', 'wasteAmount', 'clothes', 'electronics', 'foodWaste'].forEach(id => {
    updateSlider(id);
  });
});