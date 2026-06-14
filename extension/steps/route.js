(function (root) {
  const { byText, click, clickableByText, textOf, waitFor } = root.HikingFormHelpers;

  function applicationLinkForRoute(routeText) {
    const container = routeText.parentElement?.parentElement;
    return [...(container?.querySelectorAll("a") || [])].find((link) =>
      textOf(link).includes("進入申請"),
    );
  }

  root.HikingFormStepHandlers = root.HikingFormStepHandlers || {};
  root.HikingFormStepHandlers.route = async function route(data, updateSession) {
    await click(() => clickableByText(data.org, true), data.org);
    const routeText = await waitFor(() => byText(data.route, { exact: true }), data.route);
    const applicationLink = await waitFor(
      () => applicationLinkForRoute(routeText),
      `${data.route} 的進入申請連結`,
    );
    await updateSession({ stage: "agreements" });
    await click(applicationLink, `${data.route} 的進入申請連結`);
  };
})(globalThis);
