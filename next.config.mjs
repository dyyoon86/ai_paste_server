/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Remotion source lives in /remotion and is bundled by the Remotion CLI,
  // not by Next. We keep API route bodies small; large render work runs in a
  // spawned child process.
  experimental: {
    // Allow large JSON paste payloads on server actions / route handlers.
  },
};

export default nextConfig;
