(function (root) {
  const TEMPLATES = Object.freeze([
    {
      id: "da-jian-two-days",
      label: "大劍兩天",
      fileName: "application.大劍兩天.json",
    },
    {
      id: "qilai-main-north-two-days",
      label: "奇萊主北兩天",
      fileName: "application.奇萊主北兩天.json",
    },
    {
      id: "taoshan",
      label: "桃山",
      fileName: "application.桃山.json",
    },
    {
      id: "yushan-two-days",
      label: "玉山兩天",
      fileName: "application.玉山兩天.json",
    },
  ]);

  function requireText(value, field) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`Template requires ${field} data`);
    }
  }

  function validateTemplate(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Template must be an object");
    }

    requireText(data.org, "org");
    requireText(data.route, "route");

    if (!Array.isArray(data.plan) || data.plan.length === 0) {
      throw new Error("Template requires plan data");
    }

    const leaders = Array.isArray(data.members)
      ? data.members.filter((member) => member && member.leader === true)
      : [];
    if (leaders.length !== 1) {
      throw new Error("Template requires exactly one leader");
    }

    if (
      !data.watcher ||
      typeof data.watcher !== "object" ||
      Array.isArray(data.watcher) ||
      Object.keys(data.watcher).length === 0
    ) {
      throw new Error("Template requires watcher data");
    }

    return data;
  }

  async function loadTemplate(templateId) {
    const template = TEMPLATES.find(({ id }) => id === templateId);
    if (!template) {
      throw new Error(`Unknown template: ${templateId}`);
    }
    if (!root.chrome?.runtime?.getURL) {
      throw new Error("Chrome extension runtime is unavailable");
    }

    const url = root.chrome.runtime.getURL(`templates/${template.fileName}`);
    const response = await root.fetch(url);
    if (!response.ok) {
      throw new Error(`Unable to load template: ${templateId}`);
    }

    return validateTemplate(await response.json());
  }

  const api = { TEMPLATES, loadTemplate, validateTemplate };
  root.HikingTemplates = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(globalThis);
