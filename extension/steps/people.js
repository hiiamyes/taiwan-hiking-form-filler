(function (root) {
  const { byText, check, click, clickableByText, fill, input, select, sleep, textOf } =
    root.HikingFormHelpers;

  async function fillAddress(prefix, person, fallback = {}) {
    await fill(() => input(prefix.name, fallback.name), person.name, `${prefix.name} 姓名`);
    await fill(
      () => input(prefix.phone, fallback.phone),
      person.homePhone || person.mobilePhone,
      `${prefix.phone} 電話`,
    );
    await select(() => document.querySelector(prefix.city), person.city, `${prefix.city} 縣市`);
    await select(
      () => document.querySelector(prefix.district),
      person.district,
      `${prefix.district} 地區`,
    );
    await fill(
      () => input(prefix.address, fallback.address),
      person.addressDetail,
      `${prefix.address} 地址`,
    );
    await fill(
      () => input(prefix.mobile, fallback.mobile),
      person.mobilePhone,
      `${prefix.mobile} 手機`,
    );
    await fill(() => input(prefix.email, fallback.email), person.email, `${prefix.email} email`);
    await select(() => document.querySelector(prefix.nation), "中華民國", `${prefix.nation} 國籍`);
    await fill(() => input(prefix.id, fallback.id), person.idNumber, `${prefix.id} 證號`);
    await fill(
      () => document.querySelector(prefix.birthday),
      person.birthday,
      `${prefix.birthday} 生日`,
    );
    await fill(
      () => input(prefix.contactName, "緊急聯絡人姓名"),
      person.emergencyContactName,
      "緊急聯絡人姓名",
    );
    await fill(
      () => input(prefix.contactPhone, "緊急聯絡人電話"),
      person.emergencyContactPhone,
      "緊急聯絡人電話",
    );
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
        birthday: isTaroko
          ? 'input[name="ctl00$con$step2$apply_birthday"]'
          : 'input[name="ctl00$con$apply_birthday"]',
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

    await click(() => clickableByText("領隊資料"), "領隊資料");
    await check(
      () =>
        [...document.querySelectorAll('input[type="checkbox"]')].find((item) =>
          textOf(item.closest("label, tr, div")).includes("同申請人"),
        ),
      "同申請人",
    );

    if (members.length) {
      await click(() => clickableByText("隊員資料"), "隊員資料");
      const keyType = document.querySelector(
        isTaroko ? "#con_step2_member_keytype" : "#con_member_keytype",
      );
      if (keyType && !isYushan && !keyType.checked) keyType.click();
      await sleep(1500);
    }

    for (let index = 0; index < members.length; index += 1) {
      await click(() => clickableByText("新增隊員"), "新增隊員");
      await sleep(800);
      const member = members[index];
      const memberRoot = isTaroko
        ? document
        : byText(`No.${index + 1}隊員資料`)?.closest("fieldset, .panel, div") || document;
      const memberInput = (suffix, text) =>
        document.querySelector(
          `#${isTaroko ? "con_step2" : "con"}_lisMem_${suffix}_${index}`,
        ) ||
        [...memberRoot.querySelectorAll("input, select")].find((item) =>
          [item.placeholder, item.ariaLabel, item.title]
            .filter(Boolean)
            .some((value) => value.includes(text)),
        );

      await fill(() => memberInput("member_name", "請輸入姓名"), member.name, "隊員姓名");
      await select(() => memberInput("ddlmember_country", ""), member.city, "隊員縣市");
      await select(() => memberInput("ddlmember_city", ""), member.district, "隊員地區");
      await fill(() => memberInput("member_addr", "請輸入地址"), member.addressDetail, "隊員地址");
      if (member.homePhone) {
        await fill(() => memberInput("member_tel", "請輸入電話"), member.homePhone, "隊員電話");
      }
      await fill(() => memberInput("member_mobile", "請輸入手機"), member.mobilePhone, "隊員手機");
      await fill(() => memberInput("member_email", "請輸入電子郵件"), member.email, "隊員 email");
      await fill(() => memberInput("member_sid", "請輸入證號"), member.idNumber, "隊員證號");
      await select(() => memberInput("member_nation", ""), "中華民國", "隊員國籍");
      await fill(
        () =>
          document.querySelector(
            isTaroko
              ? `input[name="ctl00$con$step2$lisMem$ctrl${index + 1}$member_birthday"]`
              : `input[name="ctl00$con$lisMem$ctrl${index + 1}$member_birthday"]`,
          ),
        member.birthday,
        "隊員生日",
      );
      await fill(
        () => memberInput("member_contactname", "緊急聯絡人姓名"),
        member.emergencyContactName,
        "隊員緊急聯絡人",
      );
      await fill(
        () => memberInput("member_contacttel", "緊急聯絡人電話"),
        member.emergencyContactPhone,
        "隊員緊急聯絡電話",
      );
    }

    await click(() => clickableByText("留守人資料"), "留守人資料");
    const watcherPrefix = isTaroko ? "#con_step2" : "#con";
    await fill(
      () => input(`${watcherPrefix}_stay_name`, isYushan ? "請輸入姓名" : "留守人姓名"),
      data.watcher.name,
      "留守人姓名",
    );
    await fill(
      () => input(`${watcherPrefix}_stay_tel`, "留守人電話"),
      data.watcher.homePhone || data.watcher.mobilePhone,
      "留守人電話",
    );
    await fill(
      () => input(`${watcherPrefix}_stay_mobile`, isYushan ? "請輸入手機(或電話)" : "留守人手機"),
      data.watcher.mobilePhone,
      "留守人手機",
    );
    await fill(
      () => document.querySelector(`${watcherPrefix}_stay_email`),
      data.watcher.email,
      "留守人 email",
    );
    if (!isTaroko) {
      await fill(
        () => document.querySelector('input[name="ctl00$con$stay_birthday"]'),
        data.watcher.birthday,
        "留守人生日",
      );
    }

    const oneMan = document.querySelector("#con_cbOneMan");
    if (oneMan && !oneMan.checked) oneMan.click();

    await updateSession({ stage: "final" });
    await click(() => document.querySelector("#con_btnToStep31"), "前往最後確認頁");
  };
})(globalThis);
