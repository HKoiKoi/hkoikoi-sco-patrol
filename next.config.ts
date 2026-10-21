import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // 실기기 테스트용 HTTPS 터널(개발 서버 전용 설정, 운영에는 영향 없음)
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app"],
};

export default nextConfig;
