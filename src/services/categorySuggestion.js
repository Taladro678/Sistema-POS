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
        if (normalizedName.includes(normalizedKeyword)) {
            let points = 10; // Base points

            // Check if it's a "clean" match (whole words or exact)
            const isExactMatch = normalizedName === normalizedKeyword;
            const isWordMatch = nameWords.includes(normalizedKeyword);

            if (isExactMatch) {
                points += 60; // Huge bonus for exact identity
            } else if (isWordMatch) {
                points += 25; // Bonus for containing the exact word
            }

            // Bonus for match location
            const position = normalizedName.indexOf(normalizedKeyword);
            if (position === 0) {
                points += 20; // Starts with keyword
            }

            // Slight penalty for later keywords in category definition
            const keywordPenalty = Math.min(index * 0.5, 5);
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
        const score = calculateScore(productName, category.keywords || []);

        if (score > bestScore) {
            bestScore = score;
            bestCategory = category;
        }
    });

    // If no match found at all
    if (bestScore <= 0) return null;

    // confidence level thresholds
    let confidence = 'low';
    if (bestScore >= 40) {
        confidence = 'high';
    } else if (bestScore >= 10) { // Even a base match is medium if we return it
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
