import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"

/**
 * Next 16에는 `next lint`가 없다. package.json의 lint 스크립트가 그대로
 * `next lint`였던 탓에 Next가 "lint"를 디렉터리 이름으로 읽고 "no such
 * directory"로 죽었다 — 즉 이 앱은 린트를 돈 적이 없다.
 *
 * eslint-config-next 16은 플랫 설정을 그대로 내보내므로 FlatCompat이 필요 없다.
 */
const config = [
  { ignores: [".next/**", "out/**", "node_modules/**", "next-env.d.ts"] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // 쓰지 않는 값은 지운다. _로 시작하는 것만 봐준다(구조 분해에서 남는 것들).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]

export default config
