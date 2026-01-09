/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,

    // Remove X-Powered-By header for security
    poweredByHeader: false,

    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
    },

    images: {
        dangerouslyAllowSVG: true,
        contentDispositionType: 'attachment',
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
        remotePatterns: [
            // Simple Icons (legacy, kept for fallback)
            {
                protocol: 'https',
                hostname: 'cdn.simpleicons.org',
            },
            // Google user profile images
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
            },
            // Brandfetch CDN - Company logos (primary)
            {
                protocol: 'https',
                hostname: 'cdn.brandfetch.io',
            },
            // Google Favicon API (fallback)
            {
                protocol: 'https',
                hostname: 'www.google.com',
            },
            // UI Avatars (fallback placeholder)
            {
                protocol: 'https',
                hostname: 'ui-avatars.com',
            },
            // Devicon CDN via jsDelivr - Tech icons (primary)
            {
                protocol: 'https',
                hostname: 'cdn.jsdelivr.net',
            },
            // Clearbit Logo API
            {
                protocol: 'https',
                hostname: 'logo.clearbit.com',
            },
        ],
    },

    async headers() {
        return [
            // Security headers for all routes
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on'
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload'
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY'
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin'
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(self), geolocation=(), interest-cohort=()'
                    },
                ],
            },
            // Cache control for static assets
            {
                source: '/:all*(svg|jpg|png|webp|gif|ico)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
            {
                source: '/_next/static/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;