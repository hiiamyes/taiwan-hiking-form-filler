(function (root) {
  const { click, clickableByText } = root.HikingFormHelpers;

  root.HikingFormStepHandlers = root.HikingFormStepHandlers || {};
  root.HikingFormStepHandlers.agreements = async function agreements(_data, updateSession) {
    for (const checkbox of document.querySelectorAll('input[type="checkbox"]:not(:disabled)')) {
      if (!checkbox.checked) checkbox.click();
    }
    await updateSession({ stage: "itinerary" });
    await click(() => clickableByText("同意", true), "同意");
  };
})(globalThis);
