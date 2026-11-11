import { h, icon, run, toast, assetUrl } from '../ui.js';
import { rpc, sb, q } from '../api/client.js';
import { store, refreshMe } from '../store.js';
import { navBar } from '../components.js';

export async function shopPage(root) {
  const grid = h('div', { class: 'grid2' });
  const coins = h('span', null, store.me.coins_balance);
  root.replaceChildren(h('main', { class: 'page' },
    h('div', { class: 'row between' }, h('h2', null, 'المتجر'), h('div', { class: 'pill gold' }, icon('coin', 18), coins)), grid), navBar('#/shop'));

  async function load() {
    const [items, inv] = await Promise.all([
      q(sb.from('shop_items').select('*').order('sort_order').order('price')),
      q(sb.from('user_inventory').select('item_id')),
    ]);
    const owned = new Set(inv.map(i => i.item_id));
    grid.replaceChildren();
    if (!items.length) grid.append(h('div', { class: 'empty span2' }, 'المتجر فاضي حاليا، تابعنا قريبا.'));
    for (const it of items) {
      const mine = owned.has(it.id);
      const equipped = store.me.avatar_frame_id === it.id || store.me.title_id === it.id || store.me.avatar_id === it.id;
      grid.append(h('div', { class: 'card shop-item' },
        it.image_url ? h('img', { src: assetUrl(it.image_url), alt: '', loading: 'lazy', class: it.type === 'avatar' ? 'av' : '' }) : h('div', { class: 'shop-ph' }, icon('star', 28)),
        h('b', null, it.name_ar), h('small', { class: 'muted' }, it.type === 'frame' ? 'إطار' : it.type === 'title' ? 'لقب' : 'شخصية'),
        mine
          ? h('button', { class: 'btn ' + (equipped ? 'ghost' : 'primary') + ' block', onClick: (e) => run(async () => {
              if (equipped) await rpc('unequip_slot', { p_type: it.type }); else await rpc('equip_item', { p_item: it.id });
              await refreshMe(); await load();
            }, e.currentTarget) }, equipped ? 'إزالة' : 'تفعيل')
          : h('button', { class: 'btn primary block', onClick: (e) => run(async () => {
              await rpc('purchase_item', { p_item: it.id }); toast('تم الشراء', 'ok');
              await refreshMe(); coins.textContent = store.me.coins_balance; await load();
            }, e.currentTarget) }, it.price === 0 ? 'مجاني' : `${it.price} عملة`)));
    }
  }
  await run(load);
}
