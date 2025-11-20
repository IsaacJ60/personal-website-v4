"use client";

import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();

  // Prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isLight = theme === "light";

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="theme-toggle"
        checked={isLight}
        onCheckedChange={(checked) => setTheme(checked ? "light" : "dark")}
      />
      <Label htmlFor="theme-toggle">
        {isLight ? "Light Mode" : "Dark Mode"}
      </Label>
    </div>
  );
}
