import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Правила React Compiler: подсказки, а не блокеры. Код унаследован из Lovable,
      // паттерн «setState внутри useEffect после чтения window/localStorage» там повсеместен.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      // Картинки отдаются как обычные <img>: часть из них — декоративные слои
      // с абсолютным позиционированием, next/image там только мешает.
      "@next/next/no-img-element": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
