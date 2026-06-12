/* ZhiMo UI 基础组件：zhimo-button / zhimo-input / zhimo-switch / zhimo-checkbox */

class ZhimoButton extends HTMLElement {
  static observedAttributes = ['disabled', 'loading'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; }
        :host([block]) { display: block; }
        :host([disabled]), :host([loading]) { pointer-events: none; }

        button {
          font-family: var(--zhimo-font);
          font-size: 14px;
          font-weight: 500;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          box-sizing: border-box;
          height: 36px;
          padding: 0 16px;
          border: 1px solid var(--zhimo-accent);
          border-radius: var(--zhimo-radius-sm);
          background: var(--zhimo-accent);
          color: var(--zhimo-accent-fg);
          cursor: pointer;
          transition: background var(--zhimo-transition), border-color var(--zhimo-transition),
                      color var(--zhimo-transition), box-shadow var(--zhimo-transition);
        }
        button:hover { background: var(--zhimo-accent-hover); border-color: var(--zhimo-accent-hover); }
        button:focus-visible { outline: none; box-shadow: var(--zhimo-focus-ring); }
        button:active { transform: translateY(0.5px); }

        :host([variant="secondary"]) button {
          background: transparent;
          border-color: var(--zhimo-fg);
          color: var(--zhimo-fg);
        }
        :host([variant="secondary"]) button:hover {
          background: var(--zhimo-bg-hover);
        }

        /* 幽灵按钮：hover 时朱砂下划线从左游走出来 */
        :host([variant="ghost"]) button {
          background: linear-gradient(var(--zhimo-seal), var(--zhimo-seal)) no-repeat;
          background-size: 0% 1px;
          background-position: 16px calc(100% - 7px);
          border-color: transparent;
          color: var(--zhimo-fg-muted);
          transition: background-size var(--zhimo-transition), color var(--zhimo-transition);
        }
        :host([variant="ghost"]) button:hover {
          background-size: calc(100% - 32px) 1px;
          color: var(--zhimo-fg);
        }

        :host([variant="danger"]) button {
          background: var(--zhimo-danger);
          border-color: var(--zhimo-danger);
          color: #fff;
        }
        :host([variant="danger"]) button:hover { filter: brightness(1.08); }

        :host([size="sm"]) button { height: 30px; padding: 0 12px; font-size: 13px; }
        :host([size="lg"]) button { height: 44px; padding: 0 22px; font-size: 15px; border-radius: var(--zhimo-radius); }

        :host([disabled]) button { opacity: 0.5; cursor: not-allowed; }

        .spinner {
          display: none;
          width: 14px;
          height: 14px;
          box-sizing: border-box;
          border: 2px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: zhimo-spin 0.6s linear infinite;
        }
        :host([loading]) .spinner { display: inline-block; }
        @keyframes zhimo-spin { to { transform: rotate(360deg); } }
      </style>
      <button part="button"><span class="spinner"></span><slot></slot></button>
    `;
    this._btn = this.shadowRoot.querySelector('button');
  }

  attributeChangedCallback() {
    this._btn.disabled = this.hasAttribute('disabled') || this.hasAttribute('loading');
  }
}

class ZhimoInput extends HTMLElement {
  static observedAttributes = ['label', 'placeholder', 'type', 'disabled', 'error', 'value'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: var(--zhimo-font); }
        label {
          display: block;
          font-family: var(--zhimo-font-serif);
          font-size: 13px;
          font-weight: 600;
          color: var(--zhimo-fg);
          margin-bottom: 4px;
        }
        label:empty { display: none; }
        /* 稿纸式输入框：只有一条底线，聚焦时变朱砂色 */
        input {
          font-family: inherit;
          font-size: 14px;
          width: 100%;
          box-sizing: border-box;
          height: 34px;
          padding: 0 2px;
          color: var(--zhimo-fg);
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--zhimo-border-strong);
          border-radius: 0;
          transition: border-color var(--zhimo-transition), box-shadow var(--zhimo-transition);
        }
        input::placeholder { color: var(--zhimo-fg-muted); }
        input:hover:not(:disabled) { border-bottom-color: var(--zhimo-fg); }
        input:focus {
          outline: none;
          border-bottom-color: var(--zhimo-seal);
          box-shadow: 0 1px 0 var(--zhimo-seal);
        }
        input:disabled { color: var(--zhimo-fg-muted); border-bottom-style: dashed; cursor: not-allowed; }
        :host([error]) input { border-bottom-color: var(--zhimo-danger); }
        :host([error]) input:focus { box-shadow: 0 1px 0 var(--zhimo-danger); }
        .error { font-size: 12px; color: var(--zhimo-danger); margin-top: 6px; }
        .error:empty { display: none; }
      </style>
      <label part="label"></label>
      <input part="input">
      <div class="error" part="error"></div>
    `;
    this._label = this.shadowRoot.querySelector('label');
    this._input = this.shadowRoot.querySelector('input');
    this._error = this.shadowRoot.querySelector('.error');
  }

  attributeChangedCallback(name, _old, val) {
    switch (name) {
      case 'label': this._label.textContent = val ?? ''; break;
      case 'placeholder': this._input.placeholder = val ?? ''; break;
      case 'type': this._input.type = val ?? 'text'; break;
      case 'disabled': this._input.disabled = val !== null; break;
      case 'error': this._error.textContent = val ?? ''; break;
      case 'value': if (this._input.value !== val) this._input.value = val ?? ''; break;
    }
  }

  get value() { return this._input.value; }
  set value(v) { this._input.value = v; }

  focus() { this._input.focus(); }
}

class ZhimoSwitch extends HTMLElement {
  static observedAttributes = ['checked', 'disabled'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--zhimo-font);
          font-size: 14px;
          color: var(--zhimo-fg);
          cursor: pointer;
          user-select: none;
        }
        :host([disabled]) { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
        .track {
          position: relative;
          flex: none;
          width: 36px;
          height: 20px;
          border-radius: var(--zhimo-radius-full);
          background: var(--zhimo-border-strong);
          transition: background var(--zhimo-transition);
        }
        .thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          box-shadow: var(--zhimo-shadow-sm);
          transition: transform var(--zhimo-transition), background var(--zhimo-transition);
        }
        :host([checked]) .track { background: var(--zhimo-seal); }
        :host([checked]) .thumb { transform: translateX(16px); }
        :host(:focus-visible) { outline: none; }
        :host(:focus-visible) .track { box-shadow: var(--zhimo-focus-ring); }
      </style>
      <span class="track" part="track"><span class="thumb" part="thumb"></span></span><slot></slot>
    `;
  }

  connectedCallback() {
    this.setAttribute('role', 'switch');
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
    this._syncAria();
    this.addEventListener('click', this._onToggle);
    this.addEventListener('keydown', this._onKeydown);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this._onToggle);
    this.removeEventListener('keydown', this._onKeydown);
  }

  attributeChangedCallback() { this._syncAria(); }

  _syncAria() { this.setAttribute('aria-checked', String(this.checked)); }

  _onToggle = () => {
    this.checked = !this.checked;
    this.dispatchEvent(new CustomEvent('change', {
      detail: { checked: this.checked }, bubbles: true, composed: true,
    }));
  };

  _onKeydown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this._onToggle(); }
  };

  get checked() { return this.hasAttribute('checked'); }
  set checked(v) { this.toggleAttribute('checked', Boolean(v)); }
}

class ZhimoCheckbox extends HTMLElement {
  static observedAttributes = ['checked', 'disabled'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--zhimo-font);
          font-size: 14px;
          color: var(--zhimo-fg);
          cursor: pointer;
          user-select: none;
        }
        :host([disabled]) { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
        .box {
          flex: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          box-sizing: border-box;
          border: 1px solid var(--zhimo-border-strong);
          border-radius: var(--zhimo-radius-sm);
          background: transparent;
          transition: background var(--zhimo-transition), border-color var(--zhimo-transition);
        }
        svg { width: 10px; height: 10px; stroke: #fff; stroke-width: 3; fill: none; opacity: 0; transition: opacity var(--zhimo-transition); }
        :host([checked]) .box { background: var(--zhimo-seal); border-color: var(--zhimo-seal); }
        :host([checked]) svg { opacity: 1; }
        :host(:focus-visible) { outline: none; }
        :host(:focus-visible) .box { box-shadow: var(--zhimo-focus-ring); }
      </style>
      <span class="box" part="box"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></span><slot></slot>
    `;
  }

  connectedCallback() {
    this.setAttribute('role', 'checkbox');
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
    this._syncAria();
    this.addEventListener('click', this._onToggle);
    this.addEventListener('keydown', this._onKeydown);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this._onToggle);
    this.removeEventListener('keydown', this._onKeydown);
  }

  attributeChangedCallback() { this._syncAria(); }

  _syncAria() { this.setAttribute('aria-checked', String(this.checked)); }

  _onToggle = () => {
    this.checked = !this.checked;
    this.dispatchEvent(new CustomEvent('change', {
      detail: { checked: this.checked }, bubbles: true, composed: true,
    }));
  };

  _onKeydown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this._onToggle(); }
  };

  get checked() { return this.hasAttribute('checked'); }
  set checked(v) { this.toggleAttribute('checked', Boolean(v)); }
}

customElements.define('zhimo-button', ZhimoButton);
customElements.define('zhimo-input', ZhimoInput);
customElements.define('zhimo-switch', ZhimoSwitch);
customElements.define('zhimo-checkbox', ZhimoCheckbox);
