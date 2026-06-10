/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Remotion source lives in /remotion and is bundled by the Remotion CLI,
  // not by Next. Render work runs in a spawned child process.
  experimental: {
    // Keep msedge-tts (websocket-based) external — required at runtime, not bundled.
    serverComponentsExternalPackages: ["msedge-tts"],
  },
};

export default nextConfig;
