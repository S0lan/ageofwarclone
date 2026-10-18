import {
  AGES,
  MAX_QUEUE,
  TICK_RATE,
  TURRET_DEFS,
  TURRET_SELL_REFUND,
  UNIT_DEFS,
  buildTurret,
  evolve,
  isOvertime,
  secondsToTicks,
  sellTurret,
  spawnUnit,
  special,
  type Command,
  type GameState,
  type PlayerId,
} from '@aow/shared';

const UNIT_KEYS = ['1', '2', '3'];
const TURRET_KEYS = ['Q', 'W'];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (html) e.innerHTML = html;
  return e;
}

function group(label: string, ...children: HTMLElement[]): HTMLElement {
  const g = el('div', 'panel');
  g.append(el('div', 'group-label', label));
  const row = el('div', 'row');
  row.append(...children);
  g.append(row);
  return g;
}

export class Hud {
  private ageLabel = el('span', 'stat');
  private goldLabel = el('span', 'stat');
  private xpLabel = el('span', 'stat');
  private xpFill = el('div');
  private enemyLabel = el('span', 'stat');
  private clockLabel = el('span', 'stat');
  private infoLabel = el('span', 'stat');
  private unitButtons: HTMLButtonElement[] = [];
  private turretButtons: HTMLButtonElement[] = [];
  private slotButtons: HTMLButtonElement[] = [];
  private evolveButton = el('button');
  private specialButton = el('button');
  private specialCd = el('div', 'cd');
  private queueEl = el('div', 'queue');
  private renderedAge = -1;
  private queueKey = '';
  private onKey = (e: KeyboardEvent) => this.handleKey(e);

  constructor(
    private root: HTMLElement,
    private send: (cmd: Command) => void,
  ) {
    root.innerHTML = '';
    const xpBar = el('span', 'xpbar');
    xpBar.append(this.xpFill);
    const stats = el('div', 'panel stats');
    stats.append(this.ageLabel, this.goldLabel, this.xpLabel, xpBar, this.enemyLabel, this.clockLabel, this.infoLabel);

    for (let i = 0; i < 3; i++) {
      const b = el('button');
      b.onclick = () => this.send(spawnUnit(i));
      this.unitButtons.push(b);
    }
    for (let i = 0; i < 2; i++) {
      const b = el('button');
      b.onclick = () => this.send(buildTurret(i));
      this.turretButtons.push(b);
    }
    for (let i = 0; i < 3; i++) {
      const b = el('button', 'turret-slot');
      b.onclick = () => this.send(sellTurret(i));
      this.slotButtons.push(b);
    }
    this.evolveButton.onclick = () => this.send(evolve());
    this.specialButton.onclick = () => this.send(special());

    const top = el('div', 'row');
    top.append(stats);
    const actions = el('div', 'row');
    actions.append(
      group('Units', ...this.unitButtons),
      group('Turrets', ...this.turretButtons),
      group('Slots (click to sell)', ...this.slotButtons),
      group('Age', this.evolveButton),
      group('Special', this.specialButton),
      group('Queue', this.queueEl),
    );
    root.append(top, actions);
  }

  show(info: string): void {
    this.infoLabel.textContent = info;
    this.renderedAge = -1;
    this.queueKey = '';
    for (const b of this.slotButtons) delete b.dataset.label;
    this.root.classList.remove('hidden');
    window.addEventListener('keydown', this.onKey);
  }

  hide(): void {
    this.root.classList.add('hidden');
    window.removeEventListener('keydown', this.onKey);
  }

  private handleKey(e: KeyboardEvent): void {
    if (e.repeat || e.target instanceof HTMLInputElement) return;
    const k = e.key.toUpperCase();
    const ui = UNIT_KEYS.indexOf(k);
    if (ui >= 0) return this.send(spawnUnit(ui));
    const ti = TURRET_KEYS.indexOf(k);
    if (ti >= 0) return this.send(buildTurret(ti));
    if (k === 'E') return this.send(evolve());
    if (k === 'S' || k === ' ') {
      e.preventDefault();
      this.send(special());
    }
  }

  update(state: GameState, myId: PlayerId): void {
    const p = state.players[myId];
    const enemy = state.players[myId === 0 ? 1 : 0];
    const age = AGES[p.age];
    const maxAge = p.age >= AGES.length - 1;

    if (this.renderedAge !== p.age) this.relabel(p.age);

    this.ageLabel.innerHTML = `<b>${age.name}</b>`;
    this.goldLabel.innerHTML = `Gold: <b>${Math.floor(p.gold)}</b>`;
    this.xpLabel.innerHTML = maxAge ? `XP: <b>${p.xp}</b>` : `XP: <b>${p.xp}</b> / ${age.xpToEvolve}`;
    this.xpFill.style.width = maxAge ? '100%' : `${Math.min(100, (p.xp / age.xpToEvolve) * 100)}%`;
    this.enemyLabel.textContent = `Enemy: ${AGES[enemy.age].name}`;
    const secs = Math.floor(state.tick / TICK_RATE);
    const overtime = isOvertime(state);
    this.clockLabel.innerHTML = `${overtime ? '<b style="color:#ff7b7b">OVERTIME</b> ' : ''}${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

    age.units.forEach((u, i) => {
      this.unitButtons[i].disabled = p.gold < u.cost || p.queue.length >= MAX_QUEUE;
    });
    const hasSlot = p.turrets.some((t) => t === null);
    age.turrets.forEach((t, i) => {
      this.turretButtons[i].disabled = p.gold < t.cost || !hasSlot;
    });
    p.turrets.forEach((t, i) => {
      const b = this.slotButtons[i];
      const label = t
        ? `${TURRET_DEFS[t.def].name}<br><span class="cost">sell +${Math.floor(TURRET_DEFS[t.def].cost * TURRET_SELL_REFUND)}</span>`
        : `Empty<br><span class="cost">&nbsp;</span>`;
      if (b.dataset.label !== label) {
        b.dataset.label = label;
        b.innerHTML = label;
      }
      b.disabled = !t;
    });

    const canEvolve = !maxAge && p.xp >= age.xpToEvolve;
    this.evolveButton.disabled = !canEvolve;
    this.evolveButton.classList.toggle('evolve-ready', canEvolve);

    const cdTotal = secondsToTicks(age.special.cooldown);
    this.specialButton.disabled = p.specialCooldown > 0;
    this.specialCd.style.width = `${(1 - p.specialCooldown / cdTotal) * 100}%`;

    const key = p.queue.map((q) => q.def).join(',');
    if (key !== this.queueKey) {
      this.queueKey = key;
      this.queueEl.innerHTML = '';
      for (let i = 0; i < MAX_QUEUE; i++) {
        const q = p.queue[i];
        const slot = el('div', 'slot', q ? `<div class="fill"></div><span>${UNIT_DEFS[q.def].name[0]}</span>` : '');
        if (q) slot.title = UNIT_DEFS[q.def].name;
        this.queueEl.append(slot);
      }
    }
    const first = p.queue[0];
    const fill = this.queueEl.querySelector<HTMLElement>('.fill');
    if (first && fill) fill.style.height = `${(1 - first.remaining / first.total) * 100}%`;
  }

  private relabel(ageIndex: number): void {
    this.renderedAge = ageIndex;
    const age = AGES[ageIndex];
    age.units.forEach((u, i) => {
      this.unitButtons[i].innerHTML =
        `${u.name}<br><span class="cost">${u.cost}g</span><span class="key">${UNIT_KEYS[i]}</span>`;
      this.unitButtons[i].title = `HP ${u.hp}, DMG ${u.damage}, range ${u.range}`;
    });
    age.turrets.forEach((t, i) => {
      this.turretButtons[i].innerHTML =
        `${t.name}<br><span class="cost">${t.cost}g</span><span class="key">${TURRET_KEYS[i]}</span>`;
      this.turretButtons[i].title = `DMG ${t.damage}, range ${t.range}${t.splash ? ', splash' : ''}`;
    });
    const next = AGES[ageIndex + 1];
    this.evolveButton.innerHTML = next
      ? `Evolve<br><span class="cost">${age.xpToEvolve} XP</span><span class="key">E</span>`
      : `Final age<br><span class="cost">&nbsp;</span>`;
    this.specialButton.innerHTML = `${age.special.name}<br><span class="cost">${age.special.cooldown}s cd</span><span class="key">S</span>`;
    this.specialButton.append(this.specialCd);
  }
}
