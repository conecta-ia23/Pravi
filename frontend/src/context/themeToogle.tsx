// src/components/ThemeToggle.tsx
import { useTheme } from "../hooks/useTheme";
import { Sun, Moon} from "lucide-react"

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme} className="px-3 py-3 rounded-full border border-app bg-card text-app"
      aria-label="Toggle theme"
      title={`Cambiar a ${theme === "dark" ? "light" : "dark"}`}
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </button>
  );
};
