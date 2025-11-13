// ui/theme.js
import { Utils } from "../core/utils.js";

export class ThemeManager {
  constructor() {
    this.currentTheme = Utils.loadPreferences("theme") || "dark";
    document.documentElement.setAttribute("data-theme", this.currentTheme);
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", this.currentTheme);
    Utils.savePreferences("theme", this.currentTheme);
  }

  attachToggle(buttonId) {
    const button = document.getElementById(buttonId);
    if (!button) return;

    button.addEventListener("click", () => {
      this.toggleTheme();
      button.classList.toggle("active");
      const icon = button.querySelector("i");
      if (icon)
        icon.className =
          this.currentTheme === "dark" ? "fas fa-moon" : "fas fa-sun";
    });
  }

  setCustomColor(color) {
    document.documentElement.style.setProperty('--accent-color', color);
    localStorage.setItem('customColor', color);
  }

  initColorPicker() {
    const picker = document.getElementById('color-picker');
    if (!picker) return;

    const savedColor = localStorage.getItem('customColor');
    if (savedColor) {
      picker.value = savedColor;
      this.setCustomColor(savedColor);
    }

    picker.addEventListener('input', (e) => {
      this.setCustomColor(e.target.value);
    });
  }

  attachColorPicker(pickerId) {
    const picker = document.getElementById(pickerId);
    if (!picker) return;

    picker.addEventListener('input', (e) => {
      this.setCustomColor(e.target.value);
    });
  }
}