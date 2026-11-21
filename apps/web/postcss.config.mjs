/**
 * PostCSS の設定。Tailwind CSS v4 の公式プラグインを使う（Turbopack と本番ビルドの両方で読まれる）。
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
