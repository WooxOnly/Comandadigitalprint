import { filterIcon } from '../../shared/filter-icon.mjs';
// Report identifiers are static template constants, never user input.
export function reportActions(detailId, filterId) {
  return `<div class='report-actions'>${detailId ? `<button type='button' class='report-action' data-open-report='${detailId}' aria-label='Detalhes' title='Detalhes'><svg class='report-plus-icon' width='12' height='12' viewBox='0 0 12 12' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' aria-hidden='true'><path d='M6 1v10M1 6h10'/></svg></button>` : ''}${filterId ? `<button type='button' class='report-action report-filter-button' data-toggle-report-filter='${filterId}' ${filterId.endsWith('-dialog') ? "aria-haspopup='dialog' " : ''}aria-controls='${filterId}' aria-expanded='false' aria-label='Filtros' title='Filtros'>${filterIcon(14)}</button>` : ''}</div>`;
}
