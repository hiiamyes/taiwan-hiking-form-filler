(function (root) {
  const { byText, textOf, waitFor } = root.HikingFormHelpers;

  function organizationButton(org) {
    return byText(org, {
      exact: true,
      selector: "button, input[type=button], input[type=submit]",
    });
  }

  function applicationLinkForVisibleRoute(route) {
    const routeTexts = [...document.querySelectorAll("*")].filter(
      (element) => textOf(element) === route && element.getClientRects().length > 0,
    );

    for (const routeText of routeTexts) {
      const container = routeText.parentElement?.parentElement;
      const link = [...(container?.querySelectorAll("a") || [])].find((item) =>
        textOf(item).includes("進入申請"),
      );
      if (link) return link;
    }

    return null;
  }

  root.HikingFormStepHandlers = root.HikingFormStepHandlers || {};
  root.HikingFormStepHandlers.route = async function route(data, updateSession) {
    const orgButton = await waitFor(() => organizationButton(data.org), `管理處：${data.org}`);
    orgButton.click();
    const applicationLink = await waitFor(
      () => applicationLinkForVisibleRoute(data.route),
      `${data.org} / ${data.route} 的進入申請連結`,
    );
    await updateSession({ stage: "agreements" });
    applicationLink.click();
  };
})(globalThis);
