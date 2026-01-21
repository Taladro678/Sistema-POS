/**
 * ====================================================================================
 * CATEGORY SUGGESTION SERVICE - Intelligent Auto-Categorization
 * ====================================================================================
 * 
 * This service provides intelligent category suggestions based on product names.
 * Uses keyword matching algorithm with weighted scoring.
 * 
 * ALGORITHM:
 * 1. Normalize product name (lowercase, remove accents)
 * 2. Match against category keywords
 * 3. Calculate score based on:
 *    - Number of keyword matches
 *    - Position of match (higher weight for matches at beginning)
 *    - Exact vs partial matches
 * 4. Return category with highest score
 * 
 * ====================================================================================
 */

/**
 * Remove accents from string for better matching
 */
const removeAccents = (str) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

/**
 * Category exclusion rules - products containing these words should NOT go in specific categories
 */
const EXCLUSION_RULES = {
    'soups': ['dental', 'crema dental', 'pasta dental', 'colgate', 'cepillo', 'aseo', 'limpieza', 'jabon', 'alfajores', 'miel', 'flores', 'calamares', 'viveres', 'polar', 'cerveza', 'licor', 'postres'],
    'pasta': ['dental', 'crema dental', 'pasta dental', 'cepillo'],
    'desserts': ['dental', 'crema dental', 'sopa', 'caldo', 'pollo', 'carne'],
    'drinks': ['crema', 'sopa', 'caldo', 'pollo', 'carne', 'galleta', 'desodorante', 'jabon', 'shampoo', 'perfume', 'limpieza', 'aseo', 'pasta', 'viveres'],
    'cheeses': ['bollo', 'bollito', 'casabe', 'arepa', 'empanada', 'cachapa', 'tequeño', 'pastelito']
};

/**
 * Keywords that should ONLY match as full words, never as substrings
 * This prevents 'cola' from matching 'chocolate', or 'te' matching 'pastel'
 */
const STRICT_KEYWORDS = ['cola', 'soda', 'te', 'cafe', 'ice', 'res', 'pan', 'ron', 'gin', 'pez', 'sal'];

/**
 * Check if product should be excluded from a category
 */
const shouldExclude = (productName, categoryId) => {
    const normalizedName = normalize(productName);
    const exclusions = EXCLUSION_RULES[categoryId] || [];

    return exclusions.some(exclusion => {
        const normalizedExclusion = normalize(exclusion);
        // Strict word check for exclusions to avoid false negatives? 
        // No, usually exclusions are specific enough. 
        // But "miel" exclude from soups -> "miel" is safe.
        return normalizedName.includes(normalizedExclusion);
    });
};

/**
 * Normalize string for comparison: lowercase, remove accents, remove non-alphanumeric (except spaces)
 */
const normalize = (str) => {
    if (!str) return '';
    // Remove accents
    let n = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // Lowercase
    n = n.toLowerCase();
    // Replace punctuation/symbols with spaces
    n = n.replace(/[^a-z0-9\s]/g, ' ');
    // Remove extra spaces
    return n.trim().replace(/\s+/g, ' ');
};

/**
 * Calculate match score for a category based on product name
 * @param {string} productName - The product name to analyze
 * @param {Array<string>} keywords - Category keywords
 * @returns {number} - Match score (higher is better)
 */
const calculateScore = (productName, keywords) => {
    const normalizedName = normalize(productName);
    const nameWords = normalizedName.split(' ');
    let score = 0;

    // Early exit if no keywords or name
    if (!keywords || keywords.length === 0 || !normalizedName) return 0;

    keywords.forEach((keyword, index) => {
        const normalizedKeyword = normalize(keyword);
        if (!normalizedKeyword) return;

        // Check for exact word match vs substring match
        const isExactMatch = normalizedName === normalizedKeyword;
        const isWordMatch = nameWords.includes(normalizedKeyword);
        const startsWithKeyword = normalizedName.startsWith(normalizedKeyword + ' ');

        // Check if this keyword must be handled strictly
        const isStrict = STRICT_KEYWORDS.includes(normalizedKeyword);

        // Only allow partial substring match if:
        // 1. Keyword is NOT strict (like 'cola' shouldn't match 'chocolate')
        // 2. Keyword is long enough (>= 5 chars) to avoid noise
        const containsKeyword = !isStrict && normalizedKeyword.length >= 5 && normalizedName.includes(normalizedKeyword);

        if (isExactMatch || isWordMatch || startsWithKeyword || containsKeyword) {
            let points = 5; // Base points for any match

            if (isStrict && !isExactMatch && !isWordMatch && !startsWithKeyword) {
                // If it's a strict keyword but just a substring (like 'cola' in 'chocolate'), skip it
                return;
            }

            if (isExactMatch) {
                points += 60; // Huge bonus for exact identity
            } else if (isWordMatch) {
                points += 30; // Bonus for containing the exact word
            } else if (startsWithKeyword) {
                points += 20; // Starts with keyword
            } else if (containsKeyword) {
                points += 5; // Lower bonus for partial match
            }

            // Bonus for match location
            if (normalizedName.indexOf(normalizedKeyword) === 0) {
                points += 15; // Starts with keyword
            }

            // Slight penalty for later keywords in category definition
            const keywordPenalty = Math.min(index * 0.3, 3);
            points -= keywordPenalty;

            score += points;
        }
    });

    return score;
};

/**
 * Suggest best category for a product based on its name
 * @param {string} productName - Product name to categorize
 * @param {Array} categories - Array of category objects with { id, label, keywords }
 * @returns {Object} - Suggested category { id, label, confidence, score } or null
 */
export const suggestCategory = (productName, categories) => {
    if (!productName || !categories || categories.length === 0) {
        return null;
    }

    let bestCategory = null;
    let bestScore = 0;

    categories.forEach(category => {
        // Skip if product should be excluded from this category
        if (shouldExclude(productName, category.id)) {
            return;
        }

        const score = calculateScore(productName, category.keywords || []);

        if (score > bestScore) {
            bestScore = score;
            bestCategory = category;
        }
    });

    // If no match found at all (lowered threshold from 0 to accept any positive score)
    if (bestScore < 5) return null; // Only reject if score is very low

    // confidence level thresholds (adjusted to be more permissive)
    let confidence = 'low';
    if (bestScore >= 30) {
        confidence = 'high';
    } else if (bestScore >= 10) {
        confidence = 'medium';
    }

    return {
        ...bestCategory,
        confidence,
        score: bestScore
    };
};

/**
 * Get category label from ID
 * @param {string} categoryId - Category ID
 * @param {Array} categories - Array of categories
 * @returns {string} - Category label
 */
export const getCategoryLabel = (categoryId, categories) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.label || categoryId;
};

/**
 * Batch suggest categories for multiple products
 * @param {Array} products - Array of product objects with name property
 * @param {Array} categories - Array of category objects
 * @returns {Array} - Products with suggested category
 */
export const batchSuggestCategories = (products, categories) => {
    return products.map(product => ({
        ...product,
        suggestedCategory: suggestCategory(product.name, categories)
    }));
};
