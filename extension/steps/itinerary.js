(function (root) {
  const { check, clickableByText, inputByText, select, setValue, sleep, textOf, waitFor } = root.HikingFormHelpers;

  root.HikingFormStepHandlers = root.HikingFormStepHandlers || {};
  root.HikingFormStepHandlers.itinerary = async function itinerary(data, updateSession) {
    const isYushan = data.org === "玉山國家公園管理處";
    const isTaroko = data.org === "太魯閣國家公園管理處";
    const daySelector = isTaroko ? "#con_step1_sumday" : "#con_sumday";
    const dateSelector = isTaroko ? "#con_step1_applystart" : "#con_applystart";
    const completionSelector = "#con_btnover, #con_step1_btnover";
    const scheduleSelector = "#con_lblSchedule, #con_step1_lblSchedule";
    const promptSelector = "#con_lbRoute, #con_step1_lbRoute";

    console.info(`itinerary started (${data.startDate}, ${data.numOfDays} days)`);

    const notice = [...document.querySelectorAll('input[type="checkbox"]')].find((checkbox) =>
      textOf(checkbox.closest("label, tr, div")).includes("已詳閱以下說明"),
    );
    if (notice && !notice.checked) {
      notice.click();
    }

    const dayField = document.querySelector(daySelector);
    const dateField = document.querySelector(dateSelector);
    const configured = dayField?.value === String(data.numOfDays) && dateField?.value === data.startDate;

    // Do not reselect these fields after a postback; changing them resets the route.
    if (!configured) {
      if (!isTaroko) {
        setValue(
          await waitFor(() => inputByText(isYushan ? "請輸入隊名" : "隊伍名稱"), "隊伍名稱"),
          `${data.teamName}-${data.startDate}`,
        );
      }
      await select(() => document.querySelector(daySelector), data.numOfDays, "行程天數");
      await select(() => document.querySelector(dateSelector), data.startDate, "入園日期");
    }

    const schedule = textOf(document.querySelector(scheduleSelector));
    const completionButton = document.querySelector(completionSelector);
    const prompt = document.querySelector(promptSelector);
    const finalSpots = data.plan.at(-1)?.spots || [];

    // The final page no longer has a current-day field, so detect completion first.
    const routeIsComplete =
      Boolean(schedule) &&
      !completionButton &&
      !prompt?.getClientRects().length &&
      finalSpots.every((spot) => schedule.toLowerCase().includes(spot.toLowerCase()));

    if (!routeIsComplete) {
      let dayIndex =
        (await waitFor(() => {
          const day = document.querySelector('[id$="hidnowday"]')?.value;
          if (!day) {
            return null;
          }
          return Number(day);
        }, "目前行程天數")) - 1;

      for (; dayIndex < data.plan.length; dayIndex++) {
        const spots = data.plan[dayIndex].spots;

        for (let spotIndex = 0; spotIndex < spots.length; spotIndex++) {
          const spot = spots[spotIndex];
          console.info(`day ${dayIndex + 1}: selecting ${spot}`);

          // Route choices are radio inputs connected to visible labels.
          await check(() => {
            const label = [...document.querySelectorAll("label")].find((label) =>
              textOf(label).toLowerCase().includes(spot.toLowerCase()),
            );
            if (label?.htmlFor) {
              return document.getElementById(label.htmlFor);
            }
            return label?.querySelector('input[type="radio"]');
          }, spot);

          const hasNextSpot = spotIndex < spots.length - 1;
          if (hasNextSpot) {
            // Give the site time to replace the available choices after each click.
            await sleep(1000);
          }
        }

        console.info(`day ${dayIndex + 1}: completing route`);
        const button = await waitFor(() => document.querySelector(completionSelector), "完成路線");
        const postBack = (button.getAttribute?.("href") || "").match(/__doPostBack\('([^']*)','([^']*)'\)/);
        const form = document.forms?.form1;
        const eventTarget = form?.querySelector("#__EVENTTARGET");
        const eventArgument = form?.querySelector("#__EVENTARGUMENT");

        // The site's completion link is an ASP.NET postback, not a normal button.
        if (postBack && form && eventTarget && eventArgument) {
          const isLastDay = dayIndex === data.plan.length - 1;
          if (isLastDay) {
            // Continue after the final postback without inspecting the completed route again.
            await updateSession({ stage: "itineraryDone" });
          }
          eventTarget.value = postBack[1];
          eventArgument.value = postBack[2];
          form.submit();
          return;
        }

        button.click();

        if (dayIndex < data.plan.length - 1) {
          await waitFor(
            () => {
              const day = document.querySelector('[id$="hidnowday"]')?.value;
              if (!day) {
                return null;
              }
              if (Number(day) - 1 <= dayIndex) {
                return null;
              }
              return true;
            },
            `第${dayIndex + 2}天行程`,
          );
        } else {
          await waitFor(() => {
            const routePrompt = document.querySelector(promptSelector);
            if (routePrompt?.getClientRects().length) {
              return null;
            }
            return true;
          }, "完成路線");
        }
      }
    }

    if (data.destination) {
      await select(() => document.querySelector("#con_NpaPlacesInfo"), data.destination, "目的地");
    }

    console.info("continuing to people form");
    await updateSession({ stage: "people" });
    (await waitFor(() => clickableByText("下一步", false), "下一步")).click();
  };

  // The final route postback reloads this page before the destination can be selected.
  root.HikingFormStepHandlers.itineraryDone = async function itineraryDone(data, updateSession) {
    if (data.destination) {
      await select(() => document.querySelector("#con_NpaPlacesInfo"), data.destination, "目的地");
    }

    console.info("continuing to people form");
    await updateSession({ stage: "people" });
    (await waitFor(() => clickableByText("下一步", false), "下一步")).click();
  };
})(globalThis);
