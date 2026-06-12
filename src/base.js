/* ZhiMo UI 基础组件：zhimo-button / zhimo-button-group / zhimo-input / zhimo-switch / zhimo-checkbox / zhimo-slider */

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
  static observedAttributes = [
    'label', 'placeholder', 'type', 'disabled', 'error', 'value', 'rows',
    'min', 'max', 'step', 'maxlength',
  ];

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
        input, textarea {
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
        textarea {
          height: auto;
          min-height: 68px;
          padding: 6px 2px;
          line-height: 1.5;
          resize: vertical;
        }
        input::placeholder, textarea::placeholder { color: var(--zhimo-fg-muted); }
        input:hover:not(:disabled), textarea:hover:not(:disabled) { border-bottom-color: var(--zhimo-fg); }
        input:focus, textarea:focus {
          outline: none;
          border-bottom-color: var(--zhimo-seal);
          box-shadow: 0 1px 0 var(--zhimo-seal);
        }
        input:disabled, textarea:disabled { color: var(--zhimo-fg-muted); border-bottom-style: dashed; cursor: not-allowed; }
        :host([error]) input, :host([error]) textarea { border-bottom-color: var(--zhimo-danger); }
        :host([error]) input:focus, :host([error]) textarea:focus { box-shadow: 0 1px 0 var(--zhimo-danger); }
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
      case 'type': this._setFieldKind(val); break;
      case 'disabled': this._input.disabled = val !== null; break;
      case 'error': this._error.textContent = val ?? ''; break;
      case 'value': if (this._input.value !== val) this._input.value = val ?? ''; break;
      case 'rows': if (this._input.tagName === 'TEXTAREA') this._input.rows = Number(val) || 3; break;
      default: // min / max / step / maxlength fall through to the native field
        val == null ? this._input.removeAttribute(name) : this._input.setAttribute(name, val);
    }
  }

  /* type="textarea" 时换成多行稿纸，其余值落到原生 input type 上 */
  _setFieldKind(type) {
    const wantTextarea = type === 'textarea';
    if (wantTextarea !== (this._input.tagName === 'TEXTAREA')) {
      const next = document.createElement(wantTextarea ? 'textarea' : 'input');
      next.setAttribute('part', 'input');
      next.value = this._input.value;
      next.placeholder = this._input.placeholder;
      next.disabled = this._input.disabled;
      for (const attr of ['min', 'max', 'step', 'maxlength']) {
        const v = this.getAttribute(attr);
        if (v != null) next.setAttribute(attr, v);
      }
      this._input.replaceWith(next);
      this._input = next;
    }
    if (wantTextarea) this._input.rows = Number(this.getAttribute('rows')) || 3;
    else this._input.type = type ?? 'text';
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
          width: 34px;
          height: 18px;
          box-sizing: border-box;
          border-radius: var(--zhimo-radius-sm);
          border: 1px solid var(--zhimo-border-strong);
          background: var(--zhimo-bg-subtle);
          transition: background var(--zhimo-transition), border-color var(--zhimo-transition);
        }
        .thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 12px;
          height: 12px;
          border-radius: 1px;
          background: var(--zhimo-border-strong);
          transition: transform var(--zhimo-transition), background var(--zhimo-transition);
        }
        :host([checked]) .track { border-color: var(--zhimo-seal); background: var(--zhimo-seal); }
        :host([checked]) .thumb { transform: translateX(16px); background: var(--zhimo-bg); }
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

class ZhimoSlider extends HTMLElement {
  static observedAttributes = ['min', 'max', 'step', 'value', 'disabled'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        :host([disabled]) { opacity: 0.5; pointer-events: none; }
        /* 墨线轨道 + 朱砂方印滑块头 */
        input {
          -webkit-appearance: none;
          appearance: none;
          display: block;
          width: 100%;
          height: 14px;
          margin: 0;
          background: transparent;
          cursor: pointer;
        }
        input::-webkit-slider-runnable-track {
          height: 1.5px;
          border-radius: 0;
          background: linear-gradient(var(--zhimo-seal), var(--zhimo-seal)) no-repeat var(--zhimo-border-strong);
          background-size: var(--fill, 0%) 100%;
        }
        input::-moz-range-track {
          height: 1.5px;
          border-radius: 0;
          background: var(--zhimo-border-strong);
          border: none;
        }
        input::-moz-range-progress {
          height: 1.5px;
          border-radius: 0;
          background: var(--zhimo-seal);
        }
        input::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 10px;
          height: 10px;
          margin-top: -4.5px;
          border-radius: var(--zhimo-radius-sm);
          background: var(--zhimo-seal);
          border: none;
          transition: background var(--zhimo-transition);
        }
        input::-moz-range-thumb {
          width: 10px;
          height: 10px;
          border-radius: var(--zhimo-radius-sm);
          background: var(--zhimo-seal);
          border: none;
        }
        input:hover::-webkit-slider-thumb { background: var(--zhimo-seal-hover); }
        input:hover::-moz-range-thumb { background: var(--zhimo-seal-hover); }
        input:focus-visible { outline: none; }
        input:focus-visible::-webkit-slider-thumb { box-shadow: var(--zhimo-focus-ring); }
        input:focus-visible::-moz-range-thumb { box-shadow: var(--zhimo-focus-ring); }
      </style>
      <input type="range" part="input">
    `;
    this._input = this.shadowRoot.querySelector('input');
    this._input.addEventListener('input', (e) => {
      e.stopPropagation();
      this._syncFill();
      this.dispatchEvent(new CustomEvent('input', {
        detail: { value: Number(this._input.value) }, bubbles: true, composed: true,
      }));
    });
    this._input.addEventListener('change', (e) => {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('change', {
        detail: { value: Number(this._input.value) }, bubbles: true, composed: true,
      }));
    });
  }

  connectedCallback() { this._syncFill(); }

  attributeChangedCallback(name, _old, val) {
    if (name === 'disabled') this._input.disabled = val !== null;
    else if (name === 'value') { if (this._input.value !== val) this._input.value = val ?? '0'; }
    else this._input[name] = val ?? '';
    this._syncFill();
  }

  _syncFill() {
    const min = Number(this._input.min) || 0;
    const max = Number(this._input.max || 100);
    const pct = ((Number(this._input.value) - min) / (max - min || 1)) * 100;
    this._input.style.setProperty('--fill', `${Math.max(0, Math.min(100, pct))}%`);
  }

  get value() { return Number(this._input.value); }
  set value(v) { this._input.value = String(v); this._syncFill(); }
}

class ZhimoButtonGroup extends HTMLElement {
  static observedAttributes = ['value', 'disabled'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-flex; }
        :host([block]) { display: flex; }
        :host([vertical]) { flex-direction: column; }
        :host([disabled]) { opacity: 0.5; pointer-events: none; }
        ::slotted(button) {
          font-family: var(--zhimo-font);
          font-size: 14px;
          font-weight: 500;
          line-height: 1;
          height: 34px;
          padding: 0 16px;
          border: 1px solid var(--zhimo-border-strong);
          margin-left: -1px;
          margin-top: 0;
          border-radius: 0;
          background: transparent;
          color: var(--zhimo-fg);
          cursor: pointer;
          position: relative;
          transition: background var(--zhimo-transition), color var(--zhimo-transition),
                      border-color var(--zhimo-transition);
        }
        :host([block]) ::slotted(button) { flex: 1; }
        :host([vertical]) ::slotted(button) { margin-left: 0; margin-top: -1px; }
        /* horizontal corners */
        :host(:not([vertical])) ::slotted(button:first-child) {
          margin-left: 0;
          border-radius: var(--zhimo-radius-sm) 0 0 var(--zhimo-radius-sm);
        }
        :host(:not([vertical])) ::slotted(button:last-child) {
          border-radius: 0 var(--zhimo-radius-sm) var(--zhimo-radius-sm) 0;
        }
        /* vertical corners */
        :host([vertical]) ::slotted(button:first-child) {
          margin-top: 0;
          border-radius: var(--zhimo-radius-sm) var(--zhimo-radius-sm) 0 0;
        }
        :host([vertical]) ::slotted(button:last-child) {
          border-radius: 0 0 var(--zhimo-radius-sm) var(--zhimo-radius-sm);
        }
        ::slotted(button:only-child) { border-radius: var(--zhimo-radius-sm); }
        ::slotted(button:hover) { background: var(--zhimo-bg-hover); }
        ::slotted(button[aria-pressed="true"]) {
          background: var(--zhimo-seal);
          color: #fff;
          border-color: var(--zhimo-seal);
          z-index: 1;
        }
        ::slotted(button[aria-pressed="true"]:hover) {
          background: var(--zhimo-seal-hover);
          border-color: var(--zhimo-seal-hover);
        }
        ::slotted(button:disabled) { color: var(--zhimo-fg-muted); cursor: not-allowed; }
        ::slotted(button:focus-visible) { outline: none; box-shadow: var(--zhimo-focus-ring); z-index: 2; }
      </style>
      <slot></slot>
    `;

    this.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn || btn.disabled) return;
      const val = btn.getAttribute('value');
      if (val === this.getAttribute('value')) return;
      this.setAttribute('value', val);
      this.dispatchEvent(new CustomEvent('change', {
        detail: { value: val }, bubbles: true, composed: true,
      }));
    });
  }

  connectedCallback() {
    this.setAttribute('role', 'group');
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
    this.addEventListener('keydown', this._onKeydown);
    this._syncSelection();
  }

  disconnectedCallback() {
    this.removeEventListener('keydown', this._onKeydown);
  }

  attributeChangedCallback(name) {
    if (name === 'value') this._syncSelection();
    if (name === 'disabled') this._buttons().forEach((b) => { b.disabled = this.hasAttribute('disabled'); });
  }

  _buttons() { return [...this.querySelectorAll('button')]; }

  _syncSelection() {
    const val = this.getAttribute('value');
    this._buttons().forEach((b) => {
      b.setAttribute('aria-pressed', String(b.getAttribute('value') === val));
    });
  }

  _onKeydown = (e) => {
    const vert = this.hasAttribute('vertical');
    const fwd = vert ? 'ArrowDown' : 'ArrowRight';
    const bwd = vert ? 'ArrowUp' : 'ArrowLeft';
    if (e.key !== fwd && e.key !== bwd) return;
    e.preventDefault();
    const btns = this._buttons().filter((b) => !b.disabled);
    if (!btns.length) return;
    const cur = btns.findIndex((b) => b.getAttribute('value') === this.getAttribute('value'));
    const next = btns[Math.max(0, Math.min(btns.length - 1, cur + (e.key === fwd ? 1 : -1)))];
    this.setAttribute('value', next.getAttribute('value'));
    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: next.getAttribute('value') }, bubbles: true, composed: true,
    }));
  };

  get value() { return this.getAttribute('value'); }
  set value(v) { v == null ? this.removeAttribute('value') : this.setAttribute('value', String(v)); }
}

customElements.define('zhimo-button', ZhimoButton);
customElements.define('zhimo-input', ZhimoInput);
customElements.define('zhimo-switch', ZhimoSwitch);
customElements.define('zhimo-checkbox', ZhimoCheckbox);
customElements.define('zhimo-slider', ZhimoSlider);
customElements.define('zhimo-button-group', ZhimoButtonGroup);
