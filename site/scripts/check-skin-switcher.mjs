import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

class ClassList {
  constructor(element) {
    this.element = element;
  }

  add(name) {
    const names = new Set(this.element.className.split(/\s+/).filter(Boolean));
    names.add(name);
    this.element.className = Array.from(names).join(" ");
  }

  remove(name) {
    this.element.className = this.element.className
      .split(/\s+/)
      .filter((item) => item && item !== name)
      .join(" ");
  }
}

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.attributes = new Map();
    this.children = [];
    this.parentElement = null;
    this.className = "";
    this.textContent = "";
    this.listeners = new Map();
    this.classList = new ClassList(this);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  get id() {
    return this.getAttribute("id") || "";
  }

  set id(value) {
    this.setAttribute("id", value);
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatch(type, target = this) {
    for (const listener of this.listeners.get(type) || []) {
      listener({ target });
    }
  }

  matches(selector) {
    if (selector === this.tagName.toLowerCase()) return true;
    if (selector.startsWith(".")) {
      return this.className.split(/\s+/).includes(selector.slice(1));
    }
    const attribute = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
    if (attribute) {
      return this.attributes.has(attribute[1]) &&
        (attribute[2] === undefined || this.getAttribute(attribute[1]) === attribute[2]);
    }
    const compound = selector.match(/^([a-z]+)?((?:\.[\w-]+|\[[^\]]+\])*)$/i);
    if (!compound) return false;
    if (compound[1] && compound[1].toUpperCase() !== this.tagName) return false;
    const tokens = compound[2].match(/\.[\w-]+|\[[^\]]+\]/g) || [];
    return tokens.every((token) => this.matches(token));
  }

  querySelectorAll(selector) {
    const parts = selector.trim().split(/\s+/);
    const result = [];
    const visit = (element, ancestors) => {
      for (const child of element.children) {
        const nextAncestors = ancestors.concat(element);
        let matched = child.matches(parts.at(-1));
        for (let index = parts.length - 2; index >= 0 && matched; index -= 1) {
          matched = nextAncestors.at(-index - 1)?.matches(parts[index]) || false;
        }
        if (matched) result.push(child);
        visit(child, nextAncestors);
      }
    };
    visit(this, []);
    return result;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  closest(selector) {
    if (this.matches(selector)) return this;
    return this.parentElement ? this.parentElement.closest(selector) : null;
  }

  set innerHTML(value) {
    this.children = [];
    this.textContent = "";
    const stack = [this];
    const tokens = value.matchAll(/<(\/?)([a-z]+)([^>]*)>|([^<]+)/gi);
    for (const token of tokens) {
      if (token[4] !== undefined) {
        const current = stack.at(-1);
        if (current.children.length === 0) current.textContent += token[4];
        continue;
      }
      const closing = token[1] === "/";
      const tagName = token[2];
      if (closing) {
        stack.pop();
        continue;
      }
      const child = new FakeElement(tagName, this.ownerDocument);
      for (const attribute of token[3].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) {
        child.setAttribute(attribute[1], attribute[2] || "");
      }
      child.className = child.getAttribute("class") || "";
      stack.at(-1).appendChild(child);
      stack.push(child);
    }
  }
}

class FakeDocument extends FakeElement {
  constructor() {
    super("document", null);
    this.ownerDocument = this;
    this.documentElement = new FakeElement("html", this);
    this.head = new FakeElement("head", this);
    this.body = new FakeElement("body", this);
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
    this.children = [this.documentElement];
    this.cookieValues = new Map([
      ["julcraft-locale", "en"],
      ["julcraft-currency", "USD"],
      ["julcraft-skin", "memphis"],
    ]);
    this.stylesheet = new FakeElement("link", this);
    this.stylesheet.setAttribute("rel", "stylesheet");
    this.stylesheet.setAttribute("href", "/css/style-memphis.css");
    this.head.appendChild(this.stylesheet);
  }

  get cookie() {
    return Array.from(this.cookieValues, ([name, value]) => `${name}=${value}`).join("; ");
  }

  set cookie(value) {
    const pair = value.split(";", 1)[0];
    const separator = pair.indexOf("=");
    this.cookieValues.set(pair.slice(0, separator), pair.slice(separator + 1));
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  getElementById(id) {
    let found = null;
    const visit = (element) => {
      if (found) return;
      if (element.id === id) {
        found = element;
        return;
      }
      for (const child of element.children) visit(child);
    };
    visit(this.documentElement);
    return found;
  }
}

const source = await readFile(new URL("../public/js/skin-switcher.js", import.meta.url), "utf8");
const css = await readFile(new URL("../public/css/skin-switcher.css", import.meta.url), "utf8");
const document = new FakeDocument();
const context = vm.createContext({
  document,
  fetch: async () => ({
    ok: true,
    json: async () => ({ currencies: [
      { code: "USD", symbol: "$" },
      { code: "UAH", symbol: "₴" },
      { code: "EUR", symbol: "€" },
    ] }),
  }),
  location: { reload() {} },
  URL,
  decodeURIComponent,
  encodeURIComponent,
});
vm.runInContext(source, context);
await new Promise((resolve) => setTimeout(resolve, 0));

const bar = document.getElementById("skin-switcher");
assert.ok(bar);
const title = bar.querySelector("[data-toggle-panel]");
const controls = bar.querySelector(".ss-controls");
assert.ok(title);
assert.ok(controls);
assert.equal(title.textContent.trim(), "View");
assert.equal(title.getAttribute("aria-expanded"), "true");
assert.equal(controls.getAttribute("aria-hidden"), "false");
assert.equal(controls.querySelectorAll(".ss-currencies button").length, 3);
assert.equal(controls.querySelectorAll(".ss-locales button").length, 3);

const cookiesBeforeToggle = document.cookie;
bar.dispatch("click", title);
assert.equal(title.getAttribute("aria-expanded"), "false");
assert.equal(controls.getAttribute("aria-hidden"), "true");
assert.equal(bar.querySelector(".ss-controls"), controls);
assert.equal(controls.querySelectorAll(".ss-currencies button").length, 3);
assert.equal(document.cookie, cookiesBeforeToggle);

bar.dispatch("click", title);
assert.equal(title.getAttribute("aria-expanded"), "true");
assert.equal(controls.getAttribute("aria-hidden"), "false");
assert.equal(bar.querySelector(".ss-controls"), controls);
assert.equal(controls.querySelectorAll(".ss-currencies button").length, 3);
assert.equal(controls.querySelectorAll(".ss-locales button").length, 3);
assert.equal(document.cookie, cookiesBeforeToggle);
assert.equal(document.head.querySelector("style"), null);
assert.match(css, /#skin-switcher\s*\{[^}]*position:\s*fixed;/s);
assert.match(css, /\.ss-controls\[aria-hidden="true"\]\s*\{\s*display:\s*none;\s*\}/s);
assert.match(css, /@media \(max-width:\s*820px\)/);

console.log("OK collapsible skin switcher");
