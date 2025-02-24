/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
        // This allows Webpack to handle binary files from node_modules
        config.module.rules.push({
            test: /\.(wasm)$/,
            type: 'javascript/auto',
            loader: 'file-loader',
        });

        return config;
    },
    // Add transpilePackages if needed
    transpilePackages: ['three', '3d-force-graph', 'force-graph'],
};

export default nextConfig; 