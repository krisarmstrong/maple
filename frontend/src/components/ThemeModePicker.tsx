import { type ThemeMode, themeModes } from "../core/theme";

interface ThemeModePickerProps {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}

export function ThemeModePicker({ mode, onChange }: ThemeModePickerProps): React.JSX.Element {
  return (
    <fieldset className="theme-picker" aria-label="Theme">
      {themeModes.map((themeMode) => (
        <label className="theme-option" key={themeMode}>
          <input
            checked={mode === themeMode}
            name="theme-mode"
            onChange={() => onChange(themeMode)}
            type="radio"
          />
          <span>{labelForMode(themeMode)}</span>
        </label>
      ))}
    </fieldset>
  );
}

function labelForMode(mode: ThemeMode): string {
  if (mode === "light") {
    return "Light";
  }
  return mode === "dark" ? "Dark" : "System";
}
