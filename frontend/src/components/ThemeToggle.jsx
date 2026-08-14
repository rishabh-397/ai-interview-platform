import React, { useState } from 'react';
import { useTheme, THEMES } from '../context/ThemeContext.jsx';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="theme-toggle">
      <button
        className="theme-toggle-swatch"
        onClick={() => setOpen((prev) => !prev)}
        title="Change theme color"
        aria-label="Change theme color"
      />
      {open && (
        <div className="theme-toggle-panel">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={theme === t.id ? 'active' : ''}
              style={{ background: t.color }}
              title={t.label}
              onClick={() => {
                setTheme(t.id);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}