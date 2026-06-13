/* ZhiMo UI 导航组件：zhimo-navbar / zhimo-tabs + zhimo-tab / zhimo-breadcrumb */

class ZhimoNavbar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .bar {
          display: flex;
          align-items: center;
          gap: 24px;
          height: 56px;
          padding: 0 24px;
          border-bottom: 1px solid var(--zhimo-border);
          background: var(--zhimo-surface-bg);
          backdrop-filter: var(--zhimo-surface-blur);
          -webkit-backdrop-filter: var(--zhimo-surface-blur);
          font-family: var(--zhimo-font);
        }
        .brand { font-family: var(--zhimo-font-serif); font-size: 16px; font-weight: 700; color: var(--zhimo-fg); }
        .links { display: flex; align-items: center; gap: 4px; flex: 1; }
        /* 朱砂下划线从左游走出来 */
        .links ::slotted(a) {
          font-size: 14px;
          color: var(--zhimo-fg-muted);
          text-decoration: none;
          padding: 6px 10px;
          background: linear-gradient(var(--zhimo-seal), var(--zhimo-seal)) no-repeat;
          background-size: 0% 1px;
          background-position: 10px calc(100% - 2px);
          transition: color var(--zhimo-transition), background-size var(--zhimo-transition);
        }
        .links ::slotted(a:hover) { color: var(--zhimo-fg); background-size: calc(100% - 20px) 1px; }
        .actions { display: flex; align-items: center; gap: 8px; }
      </style>
      <div class="bar" part="bar">
        <span class="brand" part="brand"><slot name="brand"></slot></span>
        <nav class="links" part="links"><slot></slot></nav>
        <div class="actions" part="actions"><slot name="actions"></slot></div>
      </div>
    `;
  }
}

class ZhimoTabs extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: var(--zhimo-font); }
        nav {
          display: flex;
          gap: 4px;
          border-bottom: 1px solid var(--zhimo-border);
        }
        button {
          font-family: var(--zhimo-font);
          font-size: 14px;
          font-weight: 500;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          padding: 10px 14px;
          color: var(--zhimo-fg-muted);
          cursor: pointer;
          transition: color var(--zhimo-transition);
        }
        button:hover { color: var(--zhimo-fg); }
        button.active { color: var(--zhimo-fg); border-bottom-color: var(--zhimo-seal); }
        button:focus-visible {
          outline: none;
          box-shadow: var(--zhimo-focus-ring);
          border-radius: var(--zhimo-radius-sm);
        }
      </style>
      <nav part="list" role="tablist"></nav>
      <div part="panels"><slot></slot></div>
    `;
    this._nav = this.shadowRoot.querySelector('nav');
    this._index = 0;
    this.shadowRoot.querySelector('slot').addEventListener('slotchange', () => this._build());
  }

  _build() {
    this._tabs = [...this.children].filter((el) => el.tagName === 'ZHIMO-TAB');
    this._nav.innerHTML = '';
    this._tabs.forEach((tab, i) => {
      const btn = document.createElement('button');
      btn.setAttribute('role', 'tab');
      btn.textContent = tab.getAttribute('label') ?? `标签 ${i + 1}`;
      btn.addEventListener('click', () => this.select(i));
      this._nav.appendChild(btn);
    });
    this.select(Math.min(this._index, this._tabs.length - 1), { silent: true });
  }

  select(index, { silent = false } = {}) {
    if (!this._tabs?.length || index < 0) return;
    this._index = index;
    this._tabs.forEach((tab, i) => { tab.hidden = i !== index; });
    [...this._nav.children].forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
      btn.setAttribute('aria-selected', String(i === index));
    });
    if (!silent) {
      this.dispatchEvent(new CustomEvent('change', {
        detail: { index, label: this._tabs[index].getAttribute('label') },
        bubbles: true, composed: true,
      }));
    }
  }
}

class ZhimoTab extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 16px 2px;
          font-size: 14px;
          line-height: 1.6;
          color: var(--zhimo-fg);
        }
        :host([hidden]) { display: none; }
      </style>
      <slot></slot>
    `;
  }
}

class ZhimoBreadcrumb extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: var(--zhimo-font); font-size: 14px; }
        nav { display: flex; align-items: center; flex-wrap: wrap; }
        ::slotted(*) {
          color: var(--zhimo-fg-muted);
          text-decoration: none;
          transition: color var(--zhimo-transition);
        }
        ::slotted(a:hover) { color: var(--zhimo-fg); }
        ::slotted(*:last-child) { color: var(--zhimo-fg); font-weight: 500; }
        ::slotted(*:not(:first-child))::before {
          content: '·';
          margin: 0 10px;
          color: var(--zhimo-seal);
          font-weight: 700;
        }
      </style>
      <nav part="nav" aria-label="面包屑"><slot></slot></nav>
    `;
  }
}

customElements.define('zhimo-navbar', ZhimoNavbar);
customElements.define('zhimo-tabs', ZhimoTabs);
customElements.define('zhimo-tab', ZhimoTab);
customElements.define('zhimo-breadcrumb', ZhimoBreadcrumb);
