import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// Hostname factice si URL non configurée (build / CI) — images remotePatterns exige un hostname.
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : "placeholder.supabase.co";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
