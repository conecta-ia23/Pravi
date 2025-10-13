// src/components/ThemeToggle.tsx
import { useTheme } from "../hooks/useTheme";
import { Sun, Moon} from "lucide-react"

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme} style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontSize: "22px",
        color: "var(--text-color)",
        padding: "6px 10px",
        borderRadius: "50%",
        transition: "background 0.2s",
      }}
      title={`Cambiar a tema ${theme === "dark" ? "claro" : "oscuro"}`}
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </button>
  );
};
