// Compact tablet spacing without scaling measured grids, scrolling viewports,
// touch targets, accessibility font scaling, product images or printed content.
export function compactLandscapeStyle(style: Record<string, unknown>): Record<string, unknown> {
  const result = { ...style };
  for (const [key, value] of Object.entries(style)) {
    if (typeof value !== 'number' || value <= 0) continue;
    if (key === 'fontSize') result[key] = value > 12 ? Math.max(12, Math.round(value * 0.82)) : value;
    else if (key === 'lineHeight') result[key] = Math.round(value * 0.86);
    else if (/^(padding|margin)(Top|Bottom|Left|Right|Horizontal|Vertical|Start|End)?$/.test(key) || /^(gap|rowGap|columnGap)$/.test(key)) result[key] = value > 6 ? Math.max(6, Math.round(value * 0.7)) : value;
    else if (/^border(TopLeft|TopRight|BottomLeft|BottomRight)?Radius$/.test(key)) result[key] = value > 10 ? Math.max(10, Math.round(value * 0.75)) : value;
    else if (key === 'minHeight' && value >= 44 && value <= 72) result[key] = Math.max(44, Math.round(value * 0.82));
  }
  return result;
}
