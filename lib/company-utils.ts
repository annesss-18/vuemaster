// lib/company-utils.ts

const SIMPLE_ICONS_BASE = "https://cdn.simpleicons.org";

// Map of known companies to their Simple Icons slugs
const COMPANY_LOGO_MAP: Record<string, { slug: string; color: string }> = {
    // Tech Giants
    'google': { slug: 'google', color: '4285F4' },
    'meta': { slug: 'meta', color: '0668E1' },
    'facebook': { slug: 'meta', color: '0668E1' },
    'amazon': { slug: 'amazon', color: 'FF9900' },
    'microsoft': { slug: 'microsoft', color: '5E5E5E' },
    'apple': { slug: 'apple', color: '000000' },
    'netflix': { slug: 'netflix', color: 'E50914' },

    // Tech Companies
    'stripe': { slug: 'stripe', color: '008CDD' },
    'airbnb': { slug: 'airbnb', color: 'FF5A5F' },
    'uber': { slug: 'uber', color: '000000' },
    'spotify': { slug: 'spotify', color: '1DB954' },
    'slack': { slug: 'slack', color: '4A154B' },
    'salesforce': { slug: 'salesforce', color: '00A1E0' },
    'adobe': { slug: 'adobe', color: 'FF0000' },
    'tesla': { slug: 'tesla', color: 'CC0000' },
    'twitter': { slug: 'x', color: '000000' },
    'x': { slug: 'x', color: '000000' },
    'linkedin': { slug: 'linkedin', color: '0A66C2' },
    'github': { slug: 'github', color: '181717' },
    'gitlab': { slug: 'gitlab', color: 'FC6D26' },

    // Consulting/Enterprise
    'deloitte': { slug: 'deloitte', color: '86BC25' },
    'accenture': { slug: 'accenture', color: 'A100FF' },
    'ibm': { slug: 'ibm', color: '054ADA' },
    'oracle': { slug: 'oracle', color: 'F80000' },
    'sap': { slug: 'sap', color: '0FAAFF' },

    // Fintech
    'paypal': { slug: 'paypal', color: '00457C' },
    'visa': { slug: 'visa', color: '1A1F71' },
    'mastercard': { slug: 'mastercard', color: 'EB001B' },
    'square': { slug: 'square', color: '3E4348' },

    // E-commerce
    'shopify': { slug: 'shopify', color: '7AB55C' },
    'ebay': { slug: 'ebay', color: 'E53238' },
    'walmart': { slug: 'walmart', color: '0071CE' },

    // Crypto/Web3
    'coinbase': { slug: 'coinbase', color: '0052FF' },
    'binance': { slug: 'binance', color: 'F3BA2F' },

    // Gaming
    'unity': { slug: 'unity', color: '000000' },
    'epicgames': { slug: 'epicgames', color: '313131' },
    'riot games': { slug: 'riotgames', color: 'D32936' },

    // Cloud/Infrastructure
    'aws': { slug: 'amazonaws', color: 'FF9900' },
    'azure': { slug: 'microsoftazure', color: '0078D4' },
    'gcp': { slug: 'googlecloud', color: '4285F4' },
    'digitalocean': { slug: 'digitalocean', color: '0080FF' },
    'heroku': { slug: 'heroku', color: '430098' },
    'vercel': { slug: 'vercel', color: '000000' },
    'netlify': { slug: 'netlify', color: '00C7B7' },
};

/**
 * Normalizes company name for lookup
 * "Google LLC" → "google"
 * "Meta Platforms, Inc." → "meta"
 */
function normalizeCompanyName(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+(inc\.?|llc|ltd\.?|corp\.?|corporation|platform[s]?|technologies)/gi, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

/**
 * Gets the Simple Icons URL for a company
 * Falls back to generic briefcase icon if company not found
 */
export function getCompanyLogoUrl(companyName: string): string {
    const normalized = normalizeCompanyName(companyName);

    const logoInfo = COMPANY_LOGO_MAP[normalized];

    if (logoInfo) {
        return `${SIMPLE_ICONS_BASE}/${logoInfo.slug}/${logoInfo.color}`;
    }

    // Fallback: Try to use company name as slug (works for many companies)
    // Use neutral color for unknown companies
    return `${SIMPLE_ICONS_BASE}/${normalized}/666666`;
}

/**
 * Gets the company logo or a default placeholder
 * Used when company name is "Unknown Company"
 */
export function getCompanyLogoOrDefault(companyName: string | undefined): string {
    if (!companyName || companyName === 'Unknown Company') {
        // Use a generic office/briefcase icon
        return `${SIMPLE_ICONS_BASE}/companieshouse/666666`;
    }

    return getCompanyLogoUrl(companyName);
}

/**
 * Checks if a company has a known logo
 */
export function hasKnownLogo(companyName: string): boolean {
    const normalized = normalizeCompanyName(companyName);
    return normalized in COMPANY_LOGO_MAP;
}