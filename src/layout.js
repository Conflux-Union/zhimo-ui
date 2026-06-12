/* ZhiMo UI 布局组件：my-card / my-divider */

class MyCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: var(--my-font);
          background: var(--my-bg);
          border: 1px solid var(--my-border);
          border-radius: var(--my-radius);
          box-shadow: none;
          overflow: hidden;
          transition: box-shadow var(--my-transition), border-color var(--my-transition),
                      transform var(--my-transition);
        }
        :host([hoverable]:hover) {
          box-shadow: var(--my-shadow-md);
          border-color: var(--my-fg);
          transform: translateY(-1px);
        }
        header {
          padding: 14px 18px;
          border-bottom: 1px solid var(--my-border);
          font-family: var(--my-font-serif);
          font-size: 15px;
          font-weight: 600;
          color: var(--my-fg);
        }
        .body {
          padding: 18px;
          font-size: 14px;
          line-height: 1.6;
          color: var(--my-fg);
        }
        footer {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 12px 18px;
          border-top: 1px solid var(--my-border);
          background: var(--my-bg-subtle);
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

class MyDivider extends HTMLElement {
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
          font-family: var(--my-font-serif);
          font-size: 13px;
          color: var(--my-fg-muted);
        }
        :host::before, :host::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--my-border-strong);
        }
        .mark { color: var(--my-seal); font-size: 8px; line-height: 1; }
      </style>
      <slot><span class="mark">◆</span></slot>
    `;
  }
}

customElements.define('my-card', MyCard);
customElements.define('my-divider', MyDivider);
