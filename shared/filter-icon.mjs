// Approved option 2. All callers pass static sizes and colors.
export function filterIcon(size = 18, color = 'currentColor') {
  return `<svg class="filter-adjustments-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 5h3m4 0h13M2 12h13m4 0h3M2 19h5m4 0h11"/><circle cx="7" cy="5" r="2"/><circle cx="17" cy="12" r="2"/><circle cx="9" cy="19" r="2"/></svg>`;
}
