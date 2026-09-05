(function (root) {
  const { byText, clickableByText, input, select, setValue, sleep, textOf, waitFor } = root.HikingFormHelpers;

  async function fillAddress(prefix, person, fallback = {}) {
    setValue(await waitFor(() => input(prefix.name, fallback.name), `${prefix.name} 姓名`), person.name);
    setValue(
      await waitFor(() => input(prefix.phone, fallback.phone), `${prefix.phone} 電話`),
      person.homePhone || person.mobilePhone,
    );
    await select(() => document.querySelector(prefix.city), person.city, `${prefix.city} 縣市`);
    await select(() => document.querySelector(prefix.district), person.district, `${prefix.district} 地區`);
    setValue(await waitFor(() => input(prefix.address, fallback.address), `${prefix.address} 地址`), person.addressDetail);
    setValue(await waitFor(() => input(prefix.mobile, fallback.mobile), `${prefix.mobile} 手機`), person.mobilePhone);
    setValue(await waitFor(() => input(prefix.email, fallback.email), `${prefix.email} email`), person.email);
    await select(() => document.querySelector(prefix.nation), "中華民國", `${prefix.nation} 國籍`);
    setValue(await waitFor(() => input(prefix.id, fallback.id), `${prefix.id} 證號`), person.idNumber);
    setValue(await waitFor(() => document.querySelector(prefix.birthday), `${prefix.birthday} 生日`), person.birthday);
    setValue(await waitFor(() => input(prefix.contactName, "緊急聯絡人姓名"), "緊急聯絡人姓名"), person.emergencyContactName);
    setValue(await waitFor(() => input(prefix.contactPhone, "緊急聯絡人電話"), "緊急聯絡人電話"), person.emergencyContactPhone);
  }

  root.HikingFormStepHandlers = root.HikingFormStepHandlers || {};
  root.HikingFormStepHandlers.people = async function people(data, updateSession) {
    const isYushan = data.org === "玉山國家公園管理處";
    const isTaroko = data.org === "太魯閣國家公園管理處";
    const leader = data.members.find((member) => member.leader);
    const members = data.members.filter((member) => !member.leader);

    const privacy = [...document.querySelectorAll('input[type="checkbox"]')].find((item) =>
      textOf(item.closest("label, tr, div")).includes("同意委託申請人代理蒐集"),
    );
    if (privacy && !privacy.checked) privacy.click();

    await fillAddress(
      {
        name: isTaroko ? "#con_step2_apply_name" : "#con_apply_name",
        phone: isTaroko ? "#con_step2_apply_tel" : "#con_apply_tel",
        city: isTaroko ? "#con_step2_ddlapply_country" : "#con_ddlapply_country",
        district: isTaroko ? "#con_step2_ddlapply_city" : "#con_ddlapply_city",
        address: isTaroko ? "#con_step2_apply_addr" : "#con_apply_addr",
        mobile: isTaroko ? "#con_step2_apply_mobile" : "#con_apply_mobile",
        email: isTaroko ? "#con_step2_apply_email" : "#con_apply_email",
        nation: isTaroko ? "#con_step2_apply_nation" : "#con_apply_nation",
        id: isTaroko ? "#con_step2_apply_sid" : "#con_apply_sid",
        birthday: isTaroko ? 'input[name="ctl00$con$step2$apply_birthday"]' : 'input[name="ctl00$con$apply_birthday"]',
        contactName: isTaroko ? "#con_step2_apply_contactname" : "#con_apply_contactname",
        contactPhone: isTaroko ? "#con_step2_apply_contacttel" : "#con_apply_contacttel",
      },
      leader,
      {
        name: isYushan || isTaroko ? "請輸入姓名" : "申請人姓名",
        phone: isYushan || isTaroko ? "請輸入電話" : "申請人電話",
        address: isYushan || isTaroko ? "請輸入地址" : "申請人地址",
        mobile: isYushan || isTaroko ? "請輸入手機" : "申請人手機",
        email: isYushan || isTaroko ? "請輸入電子郵件" : "申請人電子郵件",
        id: isYushan || isTaroko ? "請輸入證號" : "申請人證號",
      },
    );

    (await waitFor(() => clickableByText("領隊資料"), "領隊資料")).click();
    await fillAddress(
      {
        name: isTaroko ? "#con_step2_leader_name" : "#con_leader_name",
        phone: isTaroko ? "#con_step2_leader_tel" : "#con_leader_tel",
        city: isTaroko ? "#con_step2_ddlleader_country" : "#con_ddlleader_country",
        district: isTaroko ? "#con_step2_ddlleader_city" : "#con_ddlleader_city",
        address: isTaroko ? "#con_step2_leader_addr" : "#con_leader_addr",
        mobile: isTaroko ? "#con_step2_leader_mobile" : "#leader_mobile",
        email: isTaroko ? "#con_step2_leader_email" : "#con_leader_email",
        nation: isTaroko ? "#con_step2_leader_nation" : "#con_leader_nation",
        id: isTaroko ? "#con_step2_leader_sid" : "#con_leader_sid",
        birthday: isTaroko ? "#con_step2_leader_birthday" : "#con_leader_birthday",
        contactName: isTaroko ? "#con_step2_leader_contactname" : "#con_leader_contactname",
        contactPhone: isTaroko ? "#con_step2_leader_contacttel" : "#con_leader_contacttel",
      },
      leader,
    );

    if (members.length) {
      (await waitFor(() => clickableByText("隊員資料"), "隊員資料")).click();
      await sleep(1500);
      const keyType = document.querySelector(isTaroko ? "#con_step2_member_keytype" : "#con_member_keytype");
      if (keyType && !isYushan && !keyType.checked) keyType.click();
    }

    for (let index = 0; index < members.length; index += 1) {
      const member = members[index];
      const prefix = isTaroko ? "con_step2" : "con";
      const memberName = document.querySelector(`#${prefix}_lisMem_member_name_${index}`);

      if (!memberName) {
        const addButton = await waitFor(() => clickableByText("新增隊員"), "新增隊員");
        const postBack = (addButton.getAttribute?.("href") || "").match(/__doPostBack\('([^']*)','([^']*)'\)/);
        const form = document.forms?.form1;
        const eventTarget = form?.querySelector("#__EVENTTARGET");
        const eventArgument = form?.querySelector("#__EVENTARGUMENT");

        if (postBack && form && eventTarget && eventArgument) {
          eventTarget.value = postBack[1];
          eventArgument.value = postBack[2];
          form.submit();
          return;
        }

        addButton.click();
      }

      const memberRoot = isTaroko
        ? document
        : byText(`No.${index + 1}隊員資料`)?.closest("fieldset, .panel, div") || document;
      const memberInput = (suffix, text) =>
        document.querySelector(`#${prefix}_lisMem_${suffix}_${index}`) ||
        (text
          ? [...memberRoot.querySelectorAll("input, select")].find((item) =>
              [item.placeholder, item.ariaLabel, item.title].filter(Boolean).some((value) => value.includes(text)),
            )
          : null);

      setValue(await waitFor(() => memberInput("member_name", "請輸入姓名"), "隊員姓名"), member.name);
      await select(() => memberInput("ddlmember_country", ""), member.city, "隊員縣市");
      await select(() => memberInput("ddlmember_city", ""), member.district, "隊員地區");
      setValue(await waitFor(() => memberInput("member_addr", "請輸入地址"), "隊員地址"), member.addressDetail);
      if (member.homePhone) {
        setValue(await waitFor(() => memberInput("member_tel", "請輸入電話"), "隊員電話"), member.homePhone);
      }
      setValue(await waitFor(() => memberInput("member_mobile", "請輸入手機"), "隊員手機"), member.mobilePhone);
      setValue(await waitFor(() => memberInput("member_email", "請輸入電子郵件"), "隊員 email"), member.email);
      setValue(await waitFor(() => memberInput("member_sid", "請輸入證號"), "隊員證號"), member.idNumber);
      await select(() => memberInput("member_nation", ""), "中華民國", "隊員國籍");
      setValue(
        await waitFor(
          () =>
          document.querySelector(
            isTaroko
              ? `input[name="ctl00$con$step2$lisMem$ctrl${index + 1}$member_birthday"]`
              : `input[name="ctl00$con$lisMem$ctrl${index + 1}$member_birthday"]`,
          ),
          "隊員生日",
        ),
        member.birthday,
      );
      setValue(
        await waitFor(() => memberInput("member_contactname", "緊急聯絡人姓名"), "隊員緊急聯絡人"),
        member.emergencyContactName,
      );
      setValue(
        await waitFor(() => memberInput("member_contacttel", "緊急聯絡人電話"), "隊員緊急聯絡電話"),
        member.emergencyContactPhone,
      );
    }

    (await waitFor(() => clickableByText("留守人資料"), "留守人資料")).click();
    const watcherPrefix = isTaroko ? "#con_step2" : "#con";
    setValue(
      await waitFor(
        () => input(`${watcherPrefix}_stay_name`, isYushan ? "請輸入姓名" : "留守人姓名"),
        "留守人姓名",
      ),
      data.watcher.name,
    );
    setValue(
      await waitFor(() => input(`${watcherPrefix}_stay_tel`, "留守人電話"), "留守人電話"),
      data.watcher.homePhone || data.watcher.mobilePhone,
    );
    setValue(
      await waitFor(
        () => input(`${watcherPrefix}_stay_mobile`, isYushan ? "請輸入手機(或電話)" : "留守人手機"),
        "留守人手機",
      ),
      data.watcher.mobilePhone,
    );
    setValue(await waitFor(() => document.querySelector(`${watcherPrefix}_stay_email`), "留守人 email"), data.watcher.email);
    if (!isTaroko) {
      setValue(
        await waitFor(() => document.querySelector('input[name="ctl00$con$stay_birthday"]'), "留守人生日"),
        data.watcher.birthday,
      );
    }

    const oneMan = document.querySelector("#con_cbOneMan");
    if (oneMan && !oneMan.checked) oneMan.click();

    const nextButton = await waitFor(
      () => document.querySelector(isTaroko ? "#con_step2_bt_Next_D" : "#con_btnToStep31"),
      "前往最後確認頁",
    );
    const postBack = (nextButton.getAttribute?.("href") || "").match(
      /(?:__doPostBack|WebForm_PostBackOptions)\(["']([^"']+)["']/,
    );
    const form = document.forms?.form1;
    const eventTarget = form?.querySelector("#__EVENTTARGET");
    const eventArgument = form?.querySelector("#__EVENTARGUMENT");

    await updateSession({ stage: "final" });

    if (postBack && form && eventTarget && eventArgument) {
      eventTarget.value = postBack[1];
      eventArgument.value = "";
      form.submit();
      return;
    }

    nextButton.click();
  };
})(globalThis);
