"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import styles from "../portfolio.module.css";

export default function PortfolioThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  return <button type="button" className={styles.themeSwitch}
    onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
    {/* CSS chooses the visible action from the same root class as the palette.
        The server/client markup stays identical while the saved theme loads. */}
    <span className={styles.darkModeAction}>
      <Moon size={16} strokeWidth={1.4} aria-hidden="true" />
      <span className={styles.srOnly}>Switch to dark mode</span>
    </span>
    <span className={styles.lightModeAction}>
      <Sun size={17} strokeWidth={1.4} aria-hidden="true" />
      <span className={styles.srOnly}>Switch to light mode</span>
    </span>
  </button>;
}
