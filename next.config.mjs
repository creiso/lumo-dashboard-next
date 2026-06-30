/** @type {import('next').NextConfig} */
const nextConfig = {
    // Allow serving static HTML from public/
    async rewrites() {
        return [
            // Root serves the landing page
            { source: '/', destination: '/index.html' }
        ];
    }
};

export default nextConfig;
