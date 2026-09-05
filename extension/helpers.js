(function (root) {
  const DEFAULT_DELAY = 500;

  const sleep = (milliseconds = DEFAULT_DELAY) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds));

  async function waitFor(getElement, description, timeout = 15000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeout) {
      const element = getElement();
      if (element) return element;
      await sleep(200);
    }
    throw new Error(`找不到：${description}`);
  }

  function textOf(element) {
    return (
      element?.textContent?.replace(/\s+/g, " ").trim() ||
      element?.value?.trim?.() ||
      element?.ariaLabel ||
      element?.title ||
      ""
    );
  }

  function byText(text, { exact = false, selector = "*" } = {}) {
    return [...document.querySelectorAll(selector)].find((element) => {
      const value = textOf(element);
      return exact ? value === text : value.includes(text);
    });
  }

  function clickableByText(text, exact = false) {
    return byText(text, {
      exact,
      selector: "button, a, input[type=button], input[type=submit], label",
    });
  }

  function inputByText(text) {
    const labelled = [...document.querySelectorAll("label")].find((label) =>
      textOf(label).includes(text),
    );
    if (labelled) {
      const id = labelled.htmlFor;
      return (
        (id && document.getElementById(id)) ||
        labelled.querySelector("input, textarea, select")
      );
    }

    return [...document.querySelectorAll("input, textarea, select")].find((element) =>
      [element.placeholder, element.ariaLabel, element.title, element.name]
        .filter(Boolean)
        .some((value) => value.includes(text)),
    );
  }

  function setValue(element, value) {
    if (!element) throw new Error("Missing form field");
    const prototype =
      element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : element instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (setter) setter.call(element, value ?? "");
    else element.value = value ?? "";
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function resolveElement(elementOrGetter) {
    return typeof elementOrGetter === "function" ? elementOrGetter() : elementOrGetter;
  }

  async function select(elementOrGetter, value, description) {
    const selection = await waitFor(
      () => {
        const element = resolveElement(elementOrGetter);
        if (!element?.options) return null;
        const option = [...element.options].find(
          (item) => item.value === String(value) || textOf(item) === String(value),
        );
        return option ? { element, option } : null;
      },
      `${description} / ${value}`,
    );
    setValue(selection.element, selection.option.value);
    await sleep();
  }

  async function check(elementOrGetter, description) {
    const element = await waitFor(() => resolveElement(elementOrGetter), description);
    if (!element.checked) element.click();
  }

  function input(id, fallbackText) {
    return document.querySelector(id) || (fallbackText ? inputByText(fallbackText) : null);
  }

  root.HikingFormHelpers = {
    byText,
    check,
    clickableByText,
    input,
    inputByText,
    select,
    setValue,
    sleep,
    textOf,
    waitFor,
  };
})(globalThis);
