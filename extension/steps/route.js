(function (root) {
  const { byText, click, clickableByText, waitFor } = root.HikingFormHelpers;

  root.HikingFormStepHandlers = root.HikingFormStepHandlers || {};
  root.HikingFormStepHandlers.route = async function route(data, updateSession) {
    await click(() => clickableByText(data.org, true), data.org);
    const routeText = await waitFor(() => byText(data.route, { exact: true }), data.route);
    const container = routeText.closest("tr, li, div") || routeText.parentElement;
    await updateSession({ stage: "agreements" });
    await click(
      () => container?.querySelector("a") || clickableByText("進入申請"),
      "進入申請",
    );
  };
})(globalThis);
