import { searchPlayers } from '../api/players.api.js';
import { renderPlayerCard } from './PlayerCard.js';

/**
 * يبني مكوّن بحث كامل داخل container: input + نتائج ككروت.
 * onSelect(player) بتتنادى لما المستخدم يضغط على كارت.
 */
export function mountPlayerSearch(container, onSelect) {
  container.innerHTML = `
    <input type="text" class="player-search-input" placeholder="ابحث عن اسم لاعب...">
    <div class="player-search-results"></div>
  `;

  const input = container.querySelector('.player-search-input');
  const resultsEl = container.querySelector('.player-search-results');
  let debounceTimer;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const query = input.value.trim();

    if (query.length < 2) {
      resultsEl.innerHTML = '';
      return;
    }

    debounceTimer = setTimeout(async () => {
      const players = await searchPlayers(query);
      resultsEl.innerHTML = players.map((p) => renderPlayerCard(p)).join('');
      resultsEl.querySelectorAll('.player-card').forEach((card, i) => {
        card.addEventListener('click', () => onSelect(players[i]));
      });
    }, 250);
  });
}
