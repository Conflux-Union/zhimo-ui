/* ZhiMo UI 反馈组件：zhimo-modal / zhimo-toast / zhimo-spinner / zhimo-progress */

class ZhimoModal extends HTMLElement {
  static observedAttributes = ['open', 'heading'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: none; }
        :host([open]) { display: block; }
        .backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: var(--zhimo-overlay-bg);
          backdrop-filter: var(--zhimo-overlay-blur);
          -webkit-backdrop-filter: var(--zhimo-overlay-blur);
          animation: fade-in 150ms ease;
        }
        .dialog {
          position: fixed;
          z-index: 1001;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: min(var(--zhimo-modal-width, 480px), calc(100vw - 32px));
          box-sizing: border-box;
          background: var(--zhimo-bg);
          border: 1px solid var(--zhimo-border-strong);
          border-top: 3px solid var(--zhimo-seal);
          border-radius: var(--zhimo-radius);
          box-shadow: var(--zhimo-shadow-lg);
          font-family: var(--zhimo-font);
          animation: pop-in 180ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px 0;
          font-family: var(--zhimo-font-serif);
          font-size: 17px;
          font-weight: 600;
          color: var(--zhimo-fg);
        }
        .body {
          padding: 12px 20px 20px;
          font-size: 14px;
          line-height: 1.6;
          color: var(--zhimo-fg-muted);
        }
        footer {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 0 20px 20px;
        }
        .close {
          border: none;
          background: none;
          padding: 4px 8px;
          border-radius: var(--zhimo-radius-sm);
          font-size: 16px;
          line-height: 1;
          color: var(--zhimo-fg-muted);
          cursor: pointer;
          transition: background var(--zhimo-transition), color var(--zhimo-transition);
        }
        .close:hover { background: var(--zhimo-bg-hover); color: var(--zhimo-fg); }
        @keyframes fade-in { from { opacity: 0; } }
        @keyframes pop-in {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.96); }
        }
      </style>
      <div class="backdrop" part="backdrop"></div>
      <div class="dialog" role="dialog" aria-modal="true" part="dialog">
        <header><span class="heading"></span><button class="close" aria-label="关闭">✕</button></header>
        <div class="body"><slot></slot></div>
        <footer><slot name="footer"></slot></footer>
      </div>
    `;
    this.shadowRoot.querySelector('.backdrop').addEventListener('click', () => this.close());
    this.shadowRoot.querySelector('.close').addEventListener('click', () => this.close());
    this._onKeydown = (e) => { if (e.key === 'Escape') this.close(); };
  }

  attributeChangedCallback(name, _old, val) {
    if (name === 'heading') {
      this.shadowRoot.querySelector('.heading').textContent = val ?? '';
    }
    if (name === 'open') {
      if (val !== null) {
        document.addEventListener('keydown', this._onKeydown);
        document.body.style.overflow = 'hidden';
      } else {
        document.removeEventListener('keydown', this._onKeydown);
        document.body.style.overflow = '';
      }
    }
  }

  show() { this.setAttribute('open', ''); }

  close() {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }
}

class ZhimoToast extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 220px;
          max-width: 360px;
          padding: 12px 16px;
          box-sizing: border-box;
          background: var(--zhimo-bg);
          border: 1px solid var(--zhimo-border);
          border-radius: var(--zhimo-radius);
          box-shadow: var(--zhimo-shadow-md);
          font-family: var(--zhimo-font);
          font-size: 14px;
          color: var(--zhimo-fg);
          animation: toast-in 200ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        :host([leaving]) { animation: toast-out 200ms ease forwards; }
        /* 印章式小方点 */
        .dot {
          flex: none;
          width: 8px;
          height: 8px;
          border-radius: 1px;
          background: var(--zhimo-fg-muted);
        }
        :host([type="success"]) .dot { background: var(--zhimo-success); }
        :host([type="error"]) .dot { background: var(--zhimo-danger); }
        :host([type="warning"]) .dot { background: var(--zhimo-warning); }
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
        }
        @keyframes toast-out {
          to { opacity: 0; transform: translateY(8px); }
        }
      </style>
      <span class="dot" part="dot"></span><slot></slot>
    `;
  }
}

let _toastContainer = null;

/**
 * 弹出一条 Toast 提示。
 * toast('已保存', { type: 'success', duration: 3000 })
 * type: 'default' | 'success' | 'error' | 'warning'
 */
export function toast(message, { type = 'default', duration = 3000 } = {}) {
  if (!_toastContainer) {
    _toastContainer = document.createElement('div');
    _toastContainer.style.cssText =
      'position:fixed;bottom:24px;right:24px;z-index:2000;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(_toastContainer);
  }
  const el = document.createElement('zhimo-toast');
  el.setAttribute('type', type);
  el.textContent = message;
  _toastContainer.appendChild(el);
  setTimeout(() => {
    el.setAttribute('leaving', '');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, duration);
  return el;
}

class ZhimoSpinner extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; width: 20px; height: 20px; }
        :host([size="sm"]) { width: 14px; height: 14px; }
        :host([size="lg"]) { width: 28px; height: 28px; }
        .ring {
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          border: 2px solid var(--zhimo-border);
          border-top-color: var(--zhimo-seal);
          border-radius: 50%;
          animation: zhimo-spin 0.7s linear infinite;
        }
        @keyframes zhimo-spin { to { transform: rotate(360deg); } }
      </style>
      <div class="ring" part="ring" role="status" aria-label="加载中"></div>
    `;
  }
}

class ZhimoProgress extends HTMLElement {
  static observedAttributes = ['value'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .track {
          height: 4px;
          border-radius: 0;
          background: var(--zhimo-border-strong);
          border: none;
          overflow: hidden;
        }
        .bar {
          height: 100%;
          width: 0%;
          border-radius: 0;
          background: var(--zhimo-seal);
          transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        :host([indeterminate]) .bar {
          width: 40%;
          animation: zhimo-indeterminate 1.2s ease-in-out infinite;
        }
        @keyframes zhimo-indeterminate {
          0% { transform: translateX(-110%); }
          100% { transform: translateX(280%); }
        }
      </style>
      <div class="track" part="track" role="progressbar" aria-valuemin="0" aria-valuemax="100">
        <div class="bar" part="bar"></div>
      </div>
    `;
    this._bar = this.shadowRoot.querySelector('.bar');
    this._track = this.shadowRoot.querySelector('.track');
  }

  attributeChangedCallback(name, _old, val) {
    if (name === 'value' && !this.hasAttribute('indeterminate')) {
      const v = Math.max(0, Math.min(100, Number(val) || 0));
      this._bar.style.width = `${v}%`;
      this._track.setAttribute('aria-valuenow', String(v));
    }
  }

  get value() { return Number(this.getAttribute('value')) || 0; }
  set value(v) { this.setAttribute('value', String(v)); }
}

customElements.define('zhimo-modal', ZhimoModal);
customElements.define('zhimo-toast', ZhimoToast);
customElements.define('zhimo-spinner', ZhimoSpinner);
customElements.define('zhimo-progress', ZhimoProgress);
