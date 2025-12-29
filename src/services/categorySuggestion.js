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
 * Normalize string for comparison (lowercase, no accents, trim)
 */
const normalize = (str) => {
    if (!str) return '';
    return removeAccents(str.toLowerCase().trim());
};

/**
 * Calculate match score for a category based on product name
 * @param {string} productName - The product name to analyze
 * @param {Array<string>} keywords - Category keywords
 * @returns {number} - Match score (higher is better)
 */
const calculateScore = (productName, keywords) => {
    const normalizedName = normalize(productName);
    let score = 0;

    // Early exit if no keywords
    if (!keywords || keywords.length === 0) return 0;

    keywords.forEach((keyword, index) => {
        const normalizedKeyword = normalize(keyword);

        if (!normalizedKeyword) return;

        // Check if keyword exists in product name
        if (normalizedName.includes(normalizedKeyword)) {
            // Base points for match
            let points = 10;

            // Bonus for exact match
            if (normalizedName === normalizedKeyword) {
                points += 50;
            }

            // Bonus for start position (first words matter more)
            const position = normalizedName.indexOf(normalizedKeyword);
            if (position === 0) {
                points += 20; // Starts with keyword
            } else if (position < 5) {
                points += 10; // Near the beginning
            }

            // Bonus for word boundary match (not just substring)
            const words = normalizedName.split(/\s+/);
            if (words.some(word => word === normalizedKeyword || word.includes(normalizedKeyword))) {
                points += 15;
            }

            // Slight penalty for later keywords in category definition
            // (earlier keywords are usually more representative)
            const keywordPenalty = index * 0.5;
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
 * @returns {Object} - Suggested category { id, label, confidence }
 */
export const suggestCategory = (productName, categories) => {
    if (!productName || !categories || categories.length === 0) {
        return categories?.[0] || null;
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

    // If no good match found (score too low), return first category as default
    if (bestScore < 5) {
        return {
            ...categories[0],
            confidence: 'low',
            score: 0
        };
    }

    // Calculate confidence level
    let confidence = 'low';
    if (bestScore >= 50) {
        confidence = 'high';
    } else if (bestScore >= 20) {
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
