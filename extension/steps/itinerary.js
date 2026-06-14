(function (root) {
  const { check, click, clickableByText, fill, inputByText, select, sleep, textOf } =
    root.HikingFormHelpers;

  function radioForSpot(spot) {
    const label = [...document.querySelectorAll("label")].find((item) =>
      textOf(item).toLowerCase().includes(spot.toLowerCase()),
    );
    if (label?.htmlFor) return document.getElementById(label.htmlFor);
    return label?.querySelector('input[type="radio"]') || null;
  }

  root.HikingFormStepHandlers = root.HikingFormStepHandlers || {};
  root.HikingFormStepHandlers.itinerary = async function itinerary(data, updateSession) {
    const isYushan = data.org === "玉山國家公園管理處";
    const isTaroko = data.org === "太魯閣國家公園管理處";

    const notice = [...document.querySelectorAll('input[type="checkbox"]')].find((item) =>
      textOf(item.closest("label, tr, div")).includes("已詳閱以下說明"),
    );
    if (notice && !notice.checked) notice.click();

    if (!isTaroko) {
      await fill(
        () => inputByText(isYushan ? "請輸入隊名" : "隊伍名稱"),
        `${data.teamName || ""}-${data.startDate}`,
        "隊伍名稱",
      );
    }

    await select(
      () => document.querySelector(isTaroko ? "#con_step1_sumday" : "#con_sumday"),
      data.numOfDays,
      "行程天數",
    );
    await select(
      () => document.querySelector(isTaroko ? "#con_step1_applystart" : "#con_applystart"),
      data.startDate,
      "入園日期",
    );

    for (const day of data.plan) {
      for (const spot of day.spots) {
        await check(() => radioForSpot(spot), spot);
        await sleep(1000);
      }
      await click(() => clickableByText("完成路線"), "完成路線");
      await sleep(1000);
    }

    if (data.destination) {
      await select(() => document.querySelector("#con_NpaPlacesInfo"), data.destination, "目的地");
    }

    await updateSession({ stage: "people" });
    await click(() => clickableByText("下一步", true), "下一步");
  };
})(globalThis);
