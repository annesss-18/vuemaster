/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    
    // Enable WebSocket support
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
    },
    
    // WebSocket configuration
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.externals.push({
                'ws': 'commonjs ws',
            });
        }
        return config;
    },
    
    images: {
        dangerouslyAllowSVG: true,
        contentDispositionType: 'attachment',
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'cdn.simpleicons.org',
            },
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
            },
        ],
    },
    
    async headers() {
        return [
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