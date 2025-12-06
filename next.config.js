/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Prisma는 서버 사이드에서만 사용
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    // ssh2의 네이티브 모듈을 외부화
    config.externals = config.externals || [];
    config.externals.push({
      'cpu-features': 'commonjs cpu-features',
      './crypto/build/Release/sshcrypto.node': 'commonjs ./crypto/build/Release/sshcrypto.node',
    });

    // 선택적 의존성 무시
    config.resolve.alias = {
      ...config.resolve.alias,
      'cpu-features': false,
      './crypto/build/Release/sshcrypto.node': false,
    };

    return config;
  },
};

module.exports = nextConfig;
