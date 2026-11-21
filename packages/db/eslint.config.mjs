import tseslint from "typescript-eslint";

/**
 * packages/db の ESLint 設定。
 * TypeScript の推奨ルールだけを使い、設定はできるだけ少なく保つ。
 */
export default tseslint.config(...tseslint.configs.recommended, {
  ignores: ["drizzle/**"],
});
