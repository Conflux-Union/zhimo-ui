/* ZhiMo UI 布局组件：zhimo-card / zhimo-divider */

class ZhimoCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: var(--zhimo-font);
          background: var(--zhimo-surface-bg);
          backdrop-filter: var(--zhimo-surface-blur);
          -webkit-backdrop-filter: var(--zhimo-surface-blur);
          border: 1px solid var(--zhimo-border);
          border-radius: var(--zhimo-radius);
          box-shadow: none;
          overflow: hidden;
          transition: box-shadow var(--zhimo-transition), border-color var(--zhimo-transition),
                      transform var(--zhimo-transition);
        }
        :host([hoverable]:hover) {
          box-shadow: var(--zhimo-shadow-md);
          border-color: var(--zhimo-fg);
          transform: translateY(-1px);
        }
        header {
          padding: 14px 18px;
          border-bottom: 1px solid var(--zhimo-border);
          font-family: var(--zhimo-font-serif);
          font-size: 15px;
          font-weight: 600;
          color: var(--zhimo-fg);
        }
        .body {
          padding: 18px;
          font-size: 14px;
          line-height: 1.6;
          color: var(--zhimo-fg);
        }
        footer {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 12px 18px;
          border-top: 1px solid var(--zhimo-border);
          background: color-mix(in srgb, var(--zhimo-bg-subtle) 72%, transparent);
        }
        header[hidden], footer[hidden] { display: none; }
      </style>
      <header part="header"><slot name="header"></slot></header>
      <div class="body" part="body"><slot></slot></div>
      <footer part="footer"><slot name="footer"></slot></footer>
    `;
    // header / footer 没有内容时整块隐藏
    for (const name of ['header', 'footer']) {
      const slot = this.shadowRoot.querySelector(`slot[name="${name}"]`);
      const wrap = slot.parentElement;
      const sync = () => { wrap.hidden = slot.assignedNodes().length === 0; };
      slot.addEventListener('slotchange', sync);
      sync();
    }
  }
}

class ZhimoDivider extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 16px 0;
          font-family: var(--zhimo-font-serif);
          font-size: 13px;
          color: var(--zhimo-fg-muted);
        }
        :host::before, :host::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--zhimo-border-strong);
        }
        .mark { color: var(--zhimo-seal); font-size: 8px; line-height: 1; }
      </style>
      <slot><span class="mark">◆</span></slot>
    `;
  }
}

customElements.define('zhimo-card', ZhimoCard);
customElements.define('zhimo-divider', ZhimoDivider);
