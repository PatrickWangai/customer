import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // process.cwd() instead of __dirname: this file is sometimes transpiled
    // in an ES module context (e.g. when the native SWC binary can't load,
    // as on HostAfrica's older glibc), where __dirname doesn't exist. next
    // build/dev always run from the project root, so process.cwd() is an
    // equivalent that works either way.
    root: process.cwd(),
  },
  images: {
    // Next's built-in optimizer needs sharp's native binary, which can't
    // load on HostAfrica's host glibc — every <Image> fails to render
    // without this. Serving images unoptimized is the standard workaround.
    unoptimized: true,
  },
  experimental: {
    // HostAfrica's cPanel/CloudLinux LVE caps real process/thread counts far
    // below what Next detects from the host's raw CPU count, so "Collecting
    // page data" aborts with pthread_create() failures past a handful of
    // workers (same issue found on masterways-crm and masterways-housing).
    cpus: 1,
  },
};

export default nextConfig;
