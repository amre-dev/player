/**
 * كارت اللاعب — العنصر البصري المميز (راجع design-system-v0.1.md).
 * يُستخدم في نتائج البحث، اختيار اللاعب السري، والتخمين.
 */
export function renderPlayerCard(player) {
  const initial = (player.name_ar || player.name_en || '?').trim().charAt(0);
  const photo = player.photo_url
    ? `<img src="${player.photo_url}" alt="${player.name_ar}" class="player-card-photo">`
    : `<div class="player-card-photo player-card-photo--placeholder">${initial}</div>`;

  return `
    <button type="button" class="player-card" data-id="${player.id}">
      ${photo}
      <span class="player-card-name">${player.name_ar}</span>
      <span class="player-card-meta">${player.club || ''}</span>
    </button>
  `;
}
