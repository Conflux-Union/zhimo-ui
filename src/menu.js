/* ZhiMo UI 菜单组件：zhimo-dropdown + zhimo-menu-item / zhimo-select + zhimo-option */

const PANEL_CSS = `
  .panel {
    position: fixed;
    z-index: 1100;
    min-width: 140px;
    max-height: 60vh;
    overflow-y: auto;
    padding: 4px;
    box-sizing: border-box;
    background: var(--zhimo-bg);
    border: 1px solid var(--zhimo-border-strong);
    border-radius: var(--zhimo-radius);
    box-shadow: var(--zhimo-shadow-md);
    font-family: var(--zhimo-font);
    animation: zhimo-panel-in 120ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .panel[hidden] { display: none; }
  @keyframes zhimo-panel-in { from { opacity: 0; transform: translateY(-4px); } }
`;

/* 浮层共用逻辑：定位、视口收敛、点外关闭、Esc 关闭 */
class ZhimoPopupBase extends HTMLElement {
  connectedCallback() {
    this._onDocClick = (e) => {
      if (!e.composedPath().includes(this)) this.close();
    };
    this._onKeydown = (e) => {
      if (e.key === 'Escape') { this.close(); }
      else this._handleKey?.(e);
    };
  }

  disconnectedCallback() {
    this._unbind();
  }

  _bind() {
    document.addEventListener('pointerdown', this._onDocClick, true);
    document.addEventListener('keydown', this._onKeydown, true);
  }

  _unbind() {
    document.removeEventListener('pointerdown', this._onDocClick, true);
    document.removeEventListener('keydown', this._onKeydown, true);
  }

  get open() { return !this._panel.hidden; }

  openAt(x, y) {
    this._panel.hidden = false;
    this._panel.style.left = '0px';
    this._panel.style.top = '0px';
    this._bind();
    // 先渲染再量尺寸，贴边时往回收
    requestAnimationFrame(() => {
      const { offsetWidth: w, offsetHeight: h } = this._panel;
      this._panel.style.left = `${Math.max(8, Math.min(x, innerWidth - w - 8))}px`;
      this._panel.style.top = `${Math.max(8, Math.min(y, innerHeight - h - 8))}px`;
    });
    this.setAttribute('open', '');
  }

  openBelow(el) {
    const r = el.getBoundingClientRect();
    this._panel.style.minWidth = `${r.width}px`;
    this.openAt(r.left, r.bottom + 4);
  }

  close() {
    if (this._panel.hidden) return;
    this._panel.hidden = true;
    this.removeAttribute('open');
    this._unbind();
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }
}

class ZhimoDropdown extends ZhimoPopupBase {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; }
        ${PANEL_CSS}
      </style>
      <span part="trigger"><slot name="trigger"></slot></span>
      <div class="panel" part="panel" role="menu" hidden><slot></slot></div>
    `;
    this._panel = this.shadowRoot.querySelector('.panel');

    const trigger = this.shadowRoot.querySelector('[part="trigger"]');
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.open ? this.close() : this.openBelow(trigger);
    });

    this.addEventListener('click', (e) => {
      const item = e.target.closest?.('zhimo-menu-item');
      if (!item || item.hasAttribute('disabled')) return;
      this.dispatchEvent(new CustomEvent('select', {
        detail: { value: item.getAttribute('value') }, bubbles: true, composed: true,
      }));
      this.close();
    });
  }
}

class ZhimoMenuItem extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px;
          font-family: var(--zhimo-font);
          font-size: 13.5px;
          color: var(--zhimo-fg);
          border-radius: var(--zhimo-radius-sm);
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
          transition: background var(--zhimo-transition);
        }
        :host(:hover) { background: var(--zhimo-bg-hover); }
        :host([danger]) { color: var(--zhimo-danger); }
        :host([disabled]) { color: var(--zhimo-fg-muted); cursor: not-allowed; }
        :host([disabled]:hover) { background: none; }
      </style>
      <slot></slot>
    `;
  }

  connectedCallback() { this.setAttribute('role', 'menuitem'); }
}

class ZhimoSelect extends ZhimoPopupBase {
  static observedAttributes = ['label', 'placeholder', 'disabled', 'value'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: var(--zhimo-font); }
        :host([disabled]) { opacity: 0.5; pointer-events: none; }
        label {
          display: block;
          font-family: var(--zhimo-font-serif);
          font-size: 13px;
          font-weight: 600;
          color: var(--zhimo-fg);
          margin-bottom: 4px;
        }
        label:empty { display: none; }
        /* 与 zhimo-input 同一张稿纸：一条底线 + 朱砂聚焦 */
        .trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          width: 100%;
          box-sizing: border-box;
          height: 34px;
          padding: 0 2px;
          font-family: inherit;
          font-size: 14px;
          color: var(--zhimo-fg);
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--zhimo-border-strong);
          border-radius: 0;
          cursor: pointer;
          transition: border-color var(--zhimo-transition), box-shadow var(--zhimo-transition);
        }
        .trigger:hover { border-bottom-color: var(--zhimo-fg); }
        .trigger:focus-visible, :host([open]) .trigger {
          outline: none;
          border-bottom-color: var(--zhimo-seal);
          box-shadow: 0 1px 0 var(--zhimo-seal);
        }
        .text.placeholder { color: var(--zhimo-fg-muted); }
        .chevron {
          flex: none;
          font-size: 10px;
          color: var(--zhimo-fg-muted);
          transition: transform var(--zhimo-transition);
        }
        :host([open]) .chevron { transform: rotate(180deg); }
        ${PANEL_CSS}
      </style>
      <label part="label"></label>
      <button class="trigger" part="trigger" aria-haspopup="listbox">
        <span class="text"></span><span class="chevron">▼</span>
      </button>
      <div class="panel" part="panel" role="listbox" hidden><slot></slot></div>
    `;
    this._panel = this.shadowRoot.querySelector('.panel');
    this._labelEl = this.shadowRoot.querySelector('label');
    this._text = this.shadowRoot.querySelector('.text');
    this._trigger = this.shadowRoot.querySelector('.trigger');

    this._trigger.addEventListener('click', () => {
      this.open ? this.close() : this.openBelow(this._trigger);
    });
    this.shadowRoot.querySelector('.panel slot')
      .addEventListener('slotchange', () => this._syncText());

    this.addEventListener('click', (e) => {
      const opt = e.target.closest?.('zhimo-option');
      if (!opt || opt.hasAttribute('disabled')) return;
      this._select(opt);
    });
  }

  attributeChangedCallback(name, _old, val) {
    if (name === 'label') this._labelEl.textContent = val ?? '';
    else this._syncText();
  }

  /* 键盘：上下移动到相邻可用项并直接选中（与原生 select 行为一致） */
  _handleKey(e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const opts = this._options().filter((o) => !o.hasAttribute('disabled'));
    if (!opts.length) return;
    const cur = opts.findIndex((o) => o.getAttribute('value') === this.getAttribute('value'));
    const next = opts[Math.max(0, Math.min(opts.length - 1, cur + (e.key === 'ArrowDown' ? 1 : -1)))];
    this._select(next, { keepOpen: true });
  }

  _options() { return [...this.querySelectorAll('zhimo-option')]; }

  _select(opt, { keepOpen = false } = {}) {
    if (!keepOpen) this.close();
    if (opt.getAttribute('value') === this.getAttribute('value')) return;
    this.setAttribute('value', opt.getAttribute('value') ?? '');
    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: this.getAttribute('value') }, bubbles: true, composed: true,
    }));
  }

  _syncText() {
    const value = this.getAttribute('value');
    const current = this._options().find((o) => o.getAttribute('value') === value);
    this._options().forEach((o) => o.toggleAttribute('selected', o === current));
    this._text.textContent = current?.textContent ?? this.getAttribute('placeholder') ?? '请选择';
    this._text.classList.toggle('placeholder', !current);
  }

  get value() { return this.getAttribute('value'); }
  set value(v) { v == null ? this.removeAttribute('value') : this.setAttribute('value', String(v)); }
}

class ZhimoOption extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px;
          font-family: var(--zhimo-font);
          font-size: 13.5px;
          color: var(--zhimo-fg);
          border-radius: var(--zhimo-radius-sm);
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
          transition: background var(--zhimo-transition);
        }
        :host(:hover) { background: var(--zhimo-bg-hover); }
        :host([disabled]) { color: var(--zhimo-fg-muted); cursor: not-allowed; }
        :host([disabled]:hover) { background: none; }
        /* 选中项盖一枚小朱砂印 */
        .seal {
          flex: none;
          width: 6px;
          height: 6px;
          border-radius: 1px;
          background: var(--zhimo-seal);
          opacity: 0;
          transition: opacity var(--zhimo-transition);
        }
        :host([selected]) { color: var(--zhimo-seal); }
        :host([selected]) .seal { opacity: 1; }
      </style>
      <span class="seal" part="seal"></span><slot></slot>
    `;
  }

  connectedCallback() { this.setAttribute('role', 'option'); }
}

customElements.define('zhimo-dropdown', ZhimoDropdown);
customElements.define('zhimo-menu-item', ZhimoMenuItem);
customElements.define('zhimo-select', ZhimoSelect);
customElements.define('zhimo-option', ZhimoOption);
