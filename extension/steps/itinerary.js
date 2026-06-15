(function (root) {
  const { check, click, clickableByText, fill, inputByText, select, sleep, textOf, waitFor } =
    root.HikingFormHelpers;

  function radioForSpot(spot) {
    const label = [...document.querySelectorAll("label")].find((item) =>
      textOf(item).toLowerCase().includes(spot.toLowerCase()),
    );
    if (label?.htmlFor) return document.getElementById(label.htmlFor);
    return label?.querySelector('input[type="radio"]') || null;
  }

  function currentDayIndex() {
    const value = document.querySelector('[id$="hidnowday"]')?.value;
    return value ? Number(value) - 1 : -1;
  }

  function itineraryIsConfigured(data, isTaroko) {
    const dayCount = document.querySelector(isTaroko ? "#con_step1_sumday" : "#con_sumday");
    const startDate = document.querySelector(
      isTaroko ? "#con_step1_applystart" : "#con_applystart",
    );
    return dayCount?.value === String(data.numOfDays) && startDate?.value === data.startDate;
  }

  function completionButton() {
    return document.querySelector("#con_btnover, #con_step1_btnover");
  }

  function routeScheduleText() {
    return textOf(document.querySelector("#con_lblSchedule, #con_step1_lblSchedule"));
  }

  function routeSelectionPromptIsVisible() {
    const prompt = document.querySelector("#con_lbRoute, #con_step1_lbRoute");
    return prompt?.getClientRects().length > 0;
  }

  function routeIsComplete(data) {
    const schedule = routeScheduleText().toLowerCase();
    const finalDay = data.plan.at(-1);
    return (
      Boolean(schedule) &&
      !completionButton() &&
      !routeSelectionPromptIsVisible() &&
      finalDay.spots.every((spot) => schedule.includes(spot.toLowerCase()))
    );
  }

  function itineraryDebugState() {
    const button = completionButton();
    return {
      completionButton: button
        ? {
            id: button.id,
            href: button.getAttribute?.("href"),
            visible: button.getClientRects?.().length > 0,
          }
        : null,
      currentDay: currentDayIndex() + 1,
      routePromptVisible: routeSelectionPromptIsVisible(),
      schedule: routeScheduleText(),
    };
  }

  async function clickCompletionButton() {
    const button = await waitFor(completionButton, "完成路線");
    const href = button.getAttribute?.("href") || "";
    const postBack = href.match(/__doPostBack\('([^']*)','([^']*)'\)/);
    const form = document.forms?.form1;
    const eventTarget = form?.querySelector("#__EVENTTARGET");
    const eventArgument = form?.querySelector("#__EVENTARGUMENT");

    console.info("Taiwan Hiking Form Filler clicking completion button:", {
      ...itineraryDebugState(),
      postBackTarget: postBack?.[1] || null,
    });

    if (postBack && form && eventTarget && eventArgument) {
      eventTarget.value = postBack[1];
      eventArgument.value = postBack[2];
      form.submit();
      return true;
    }

    await click(() => button, "完成路線");
    return false;
  }

  root.HikingFormStepHandlers = root.HikingFormStepHandlers || {};
  root.HikingFormStepHandlers.itinerary = async function itinerary(data, updateSession) {
    const isYushan = data.org === "玉山國家公園管理處";
    const isTaroko = data.org === "太魯閣國家公園管理處";

    const notice = [...document.querySelectorAll('input[type="checkbox"]')].find((item) =>
      textOf(item.closest("label, tr, div")).includes("已詳閱以下說明"),
    );
    if (notice && !notice.checked) notice.click();

    if (!itineraryIsConfigured(data, isTaroko)) {
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
    }

    let dayIndex =
      (await waitFor(
        () => {
          const index = currentDayIndex();
          return index >= 0 ? index + 1 : null;
        },
        "目前行程天數",
      )) - 1;

    for (; dayIndex < data.plan.length && !routeIsComplete(data); dayIndex++) {
      const day = data.plan[dayIndex];
      for (const spot of day.spots) {
        const previousSchedule = routeScheduleText();
        await check(() => radioForSpot(spot), spot);
        await waitFor(
          () => {
            const schedule = routeScheduleText();
            return schedule !== previousSchedule &&
              schedule.toLowerCase().includes(spot.toLowerCase())
              ? true
              : null;
          },
          `路線地點：${spot}`,
        );
      }
      try {
        if (await clickCompletionButton()) return;
      } catch (error) {
        console.error("Taiwan Hiking Form Filler completion-button state:", itineraryDebugState());
        throw new Error(`${error.message}；狀態：${JSON.stringify(itineraryDebugState())}`);
      }
      if (dayIndex < data.plan.length - 1) {
        await waitFor(
          () => (currentDayIndex() > dayIndex ? true : null),
          `第${dayIndex + 2}天行程`,
        );
      } else {
        await waitFor(
          () => (routeSelectionPromptIsVisible() ? null : true),
          "完成路線",
        );
      }
    }

    if (data.destination) {
      await select(() => document.querySelector("#con_NpaPlacesInfo"), data.destination, "目的地");
    }

    await updateSession({ stage: "people" });
    await click(() => clickableByText("下一步", true), "下一步");
  };
})(globalThis);
