const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const sharp = require("sharp");
const Tesseract = require("tesseract.js");

const data = require("./application.json");
const shouldSubmit = process.argv.includes("--submit");
let isMemberDialogConsumed = false;

const promptUserInput = (promptText) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {
      console.log(promptText, answer);
      rl.close();
      resolve(answer);
    });
  });
};

const submit = async (page) => {
  if (!shouldSubmit) return;

  /**
   * auto fill captcha
   while (true) {
    const now = new Date();
    const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const cutoffSeconds = 15 * 3600 + 59 * 60 + 30; // 15:59:30
    if (currentSeconds < cutoffSeconds) {
      console.log(`Waiting... Current time: ${now.toTimeString().split(" ")[0]}`);
      await new Promise((res) => setTimeout(res, 1000));
      continue;
    }

    await page.locator(".fa-sync-alt").click();
    // console.log(`${index + 1}th try...`);
    const captchaElement = await page.locator("#con_imgcode");
    const captchaBuffer = await captchaElement.screenshot();
    const captchaPath = path.join(__dirname, "captcha.png");
    const processedBuffer = await sharp(captchaBuffer).grayscale().threshold(120).resize({ width: 400 }).toBuffer();
    fs.writeFileSync(captchaPath, processedBuffer);
    const res = await Tesseract.recognize(processedBuffer, "eng", {
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    });
    const {
      data: { text },
    } = res;
    const code = text.replace(/[^a-zA-Z0-9]/g, "").trim();
    // console.log("code: ", code);
    if (code) {
      await page.locator("#con_vcode").fill(code);
      break;
    }
  }
   */

  await new Promise((res) => setTimeout(res, 500));
  await page.locator("#con_btnsave").click();
};

async function apply() {
  const { org, teamName, route, destination, numOfDays, plan, members, watcher } = data;
  const isYushan = org === "玉山國家公園管理處";
  const isTaroko = org === "太魯閣國家公園管理處";
  let { startDate } = data;

  const leader = members.find(({ leader }) => leader);
  const membersWithoutLeader = members.filter(({ leader }) => !leader);

  const browser = await chromium.launch({
    headless: false,
    args: ["--start-maximized"],
  });
  const context = await browser.newContext({
    viewport: null,
  });
  const page = await context.newPage();
  page.on("dialog", async (dialog) => {
    console.log(`Dialog message: ${dialog.message()}`);
    if (dialog.message().includes("請詳實填寫隊員資料勿重覆")) {
      isMemberDialogConsumed = true;
    }
    dialog.dismiss().catch(() => {});
    await submit(page);
  });

  /**
   *
   */
  await page.goto("https://hike.taiwan.gov.tw/apply_1.aspx");
  await page.getByRole("button", { name: org }).click();
  const container = await page.getByText(route, { exact: true }).locator("..").locator("..");
  await container.getByRole("link", { name: "進入申請" }).click();

  /**
   *
   */
  const agreements = [
    "請注意，領隊及隊員名單如有外籍人士，請提醒攜帶具有GPS功能之通訊器材，手機請打開國際漫遊之通訊及簡訊功能，以利災害應變與聯繫。",
    "確認已於申請前詳閱「進入玉山國家公園生態保護區申請案件個人資料運用說明」，已轉知並取得全體隊員同意使用當事人個人資料辦理入園申請相關事宜。",
    "確認已於申請前詳閱並明瞭「申請及入園注意事項」及「申辦規定與須知」，並轉知全體隊員瞭解並遵守入園相關規定。並提醒若委由他人代辦，亦應檢視是否完成許可程序(如個人資料、行程規劃等均應詳加檢視)，若疏忽未檢視，難謂無過失之責。",
    "入園期間應攜帶入園許可證及身分證明文件正本俾利查核，未攜帶身分證明文件或所攜帶身分證明文件與入園許可證名冊不符者，禁止其入園。已入園者得令其離園。不聽制止或未依前段規定入園者，得依國家公園法第 19條規定處罰。",
    "為維護安全並避免意外，請勿擅自進入三六九山莊施工工區，住宿請依規定申請三六九臨時營地。",
    "請注意，領隊及隊員名單如有外籍人士，請提醒攜帶具有GPS",
    "申請人應瞭解並填具所有正確的隊員資料與行程計畫。如明知為不實或冒用他人資料填載入園申請之事項，已構成刑法第 210 條偽造文書罪嫌，或構成刑法第 214",
    "欲申請雪山西稜線之隊伍，請於申請前詳閱230林道注意事項。",
    "園區內禁止使用器具以外之炊煮、燃火行為；於乾燥季節期間，特別提高防火警覺，嚴防森林火災。",
    "進入原住民族傳統領域須知： 1",
    "入園申請隊員若具有學生身分或參加學校社團活動，請務必自行通報學校相關單位，作為緊急應變之用。",
    "本人已閱讀並充分瞭解上述注意事項，並會遵守國家公園、警政署各項規定。",
    "請確認您的隊伍是否符合「南投縣登山活動管理自治條例」、「臺中市登山活動管理自治條例」、「花蓮縣登山活動管理自治條例」內載相關規定，以免觸法。",
  ];
  for (let i = 0; i < agreements.length; i++) {
    const row = page.getByRole("row", { name: agreements[i] });
    try {
      await row.waitFor({ timeout: 200 }); // Wait up to 0.2s for the row to appear
      await row.getByRole("checkbox").check();
    } catch (e) {
      // Skip if the row or checkbox doesn't exist or timeout occurs
      continue;
    }
  }
  // taroko
  try {
    await page.locator('[id="chk[]"]').check();
  } catch (error) {
    //
  }
  await page.getByRole("button", { name: "同意", exact: true }).click();

  /**
   *
   */
  try {
    await page
      .getByRole("checkbox", {
        name: "已詳閱以下說明，並同意相關注意事項。 奇萊主北線與奇萊連峰線為(共同承載量)(114年7月1日起不分平假日，統一開放40人)。自109年2月21",
      })
      .check();
  } catch (error) {
    //
  }

  if (!isTaroko) {
    await page.getByRole("textbox", { name: isYushan ? "請輸入隊名" : "隊伍名稱" }).fill(`${teamName}-${startDate}`);
  }

  /**
   *
   */
  if (isTaroko) {
    await page.locator("#con_step1_sumday").selectOption(String(numOfDays));
    await page.locator("#con_step1_applystart").selectOption(startDate);
  } else {
    await page.locator("#con_sumday").selectOption(String(numOfDays));
    await page.locator("#con_applystart").selectOption(startDate);
  }

  /**
   *
   */
  for (let i = 0; i < plan.length; i++) {
    const day = plan[i];
    if (i > 0) {
      if (isTaroko) {
        await page.getByText(`第：${i + 1}天行程`).waitFor({ state: "visible" });
      } else {
        await page.getByText(`第${i + 1}天行程`).waitFor({ state: "visible" });
      }
    }
    for (const spot of day.spots) {
      await page.getByRole("radio", { name: new RegExp(spot, "i") }).check();
      await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(1000);
    await page.getByRole("link", { name: "  完成路線" }).click();
    await page.waitForTimeout(1000);
  }
  await page.getByText("請選擇下一個地點：").waitFor({ state: "hidden" });
  if (destination) await page.locator("#con_NpaPlacesInfo").selectOption(destination);
  await page.getByRole(isYushan ? "link" : "button", { name: "下一步" }).click();

  /**
   *
   */
  await page
    .getByRole("checkbox", {
      name: "請確認領隊或隊員同意委託申請人代理蒐集當事人個人資料，並委託其上網向國家公園管理處提出登山申請相關事宜，以免違反相關法令。",
    })
    .check();
  await page.waitForTimeout(5000);
  await page.getByRole("textbox", { name: isYushan || isTaroko ? "請輸入姓名" : "申請人姓名" }).fill(leader.name);
  await page
    .getByRole("textbox", { name: isYushan || isTaroko ? "請輸入電話" : "申請人電話" })
    .fill(leader.homePhone || leader.mobilePhone);

  if (isTaroko) {
    await page.locator("#con_step2_ddlapply_country").selectOption(leader.city);
  } else {
    await page.locator("#con_ddlapply_country").selectOption({ label: leader.city });
  }

  if (isTaroko) {
    await page.locator("#con_step2_ddlapply_city").selectOption(leader.district);
  } else {
    await page.locator("#con_ddlapply_city").selectOption({ label: leader.district });
  }

  await page
    .getByRole("textbox", { name: isYushan || isTaroko ? "請輸入地址" : "申請人地址" })
    .fill(leader.addressDetail);
  await page
    .getByRole("textbox", { name: isYushan || isTaroko ? "請輸入手機" : "申請人手機" })
    .fill(leader.mobilePhone);
  await page
    .getByRole("textbox", { name: isYushan || isTaroko ? "請輸入電子郵件" : "申請人電子郵件" })
    .fill(leader.email);
  await page.locator(isTaroko ? "#con_step2_apply_nation" : "#con_apply_nation").selectOption("中華民國");
  await page.waitForLoadState("networkidle");
  await page.getByRole("textbox", { name: isYushan || isTaroko ? "請輸入證號" : "申請人證號" }).fill(leader.idNumber);
  await page.evaluate(
    ({ leader, isTaroko }) => {
      document.querySelector(
        isTaroko ? 'input[name="ctl00$con$step2$apply_birthday"]' : 'input[name="ctl00$con$apply_birthday"]'
      ).value = leader.birthday;
    },
    { leader, isTaroko }
  );
  await page.getByRole("textbox", { name: "緊急聯絡人姓名" }).click();
  await page.waitForTimeout(2000);
  await page.getByRole("textbox", { name: "緊急聯絡人姓名" }).fill(leader.emergencyContactName);
  await page.getByRole("textbox", { name: "緊急聯絡人電話" }).fill(leader.emergencyContactPhone);

  /**
   *
   */
  if (isTaroko) {
    await page.getByRole("button", { name: "   領隊資料 (請展開填寫資料)" }).click();
  } else {
    await page.getByRole("button", { name: "   領隊資料(請展開填寫資料)" }).click();
  }
  await page.getByRole("checkbox", { name: "同申請人" }).check();

  /**
   *
   */
  if (membersWithoutLeader.length > 0) {
    if (isTaroko) {
      await page.getByRole("button", { name: "   隊員資料 (請展開填寫資料)" }).click();
    } else {
      await page.getByRole("button", { name: "   隊員資料(請展開填寫資料)" }).click();
    }
    if (!isYushan) await page.locator(isTaroko ? "#con_step2_member_keytype" : "#con_member_keytype").check();
    while (!isMemberDialogConsumed) {
      await page.waitForTimeout(5000);
    }
    await page.waitForLoadState("networkidle");
  }
  for (let i = 0; i < membersWithoutLeader.length; i++) {
    const {
      name,
      homePhone,
      mobilePhone,
      email,
      city,
      district,
      addressDetail,
      idNumber,
      emergencyContactName,
      emergencyContactPhone,
      birthday,
    } = membersWithoutLeader[i];
    const label = `No.${i + 1}隊員資料`;
    console.log(`label: ${label}`, "name: ", name);
    await page.getByRole("link", { name: new RegExp("新增隊員", "i") }).click();
    if (isTaroko) {
      //
    } else {
      await page.getByRole("button", { name: new RegExp(label, "i") }).click();
    }
    if (isTaroko) {
      await page.locator(`#con_step2_lisMem_member_name_${i}`).fill(name);
    } else {
      await page.getByLabel(label).getByRole("textbox", { name: "請輸入姓名" }).fill(name);
    }
    await page
      .locator(isTaroko ? `#con_step2_lisMem_ddlmember_country_${i}` : `#con_lisMem_ddlmember_country_${i}`)
      .selectOption({ label: city });
    await page
      .locator(isTaroko ? `#con_step2_lisMem_ddlmember_city_${i}` : `#con_lisMem_ddlmember_city_${i}`)
      .selectOption({ label: district });
    if (isTaroko) {
      await page.locator(`#con_step2_lisMem_member_addr_${i}`).fill(addressDetail);
    } else {
      await page
        .getByLabel(label)
        .getByRole("textbox", { name: isTaroko ? "請輸入聯絡地址" : "請輸入地址" })
        .fill(addressDetail);
    }
    if (isTaroko) {
      await page.locator(`#con_step2_lisMem_member_tel_${i}`).fill(homePhone || mobilePhone);
      await page.locator(`#con_step2_lisMem_member_mobile_${i}`).fill(mobilePhone);
      await page.locator(`#con_step2_lisMem_member_email_${i}`).fill(email);
      await page.locator(`#con_step2_lisMem_member_sid_${i}`).type(idNumber);
    } else {
      if (homePhone)
        await page
          .getByLabel(label)
          .getByRole("textbox", { name: "請輸入電話" })
          .fill(homePhone || mobilePhone);
      await page.getByLabel(label).getByRole("textbox", { name: "請輸入手機" }).fill(mobilePhone);
      await page.getByLabel(label).getByRole("textbox", { name: "請輸入電子郵件" }).fill(email);
      await page.getByLabel(label).getByRole("textbox", { name: "請輸入證號" }).type(idNumber);
    }

    await page
      .locator(isTaroko ? `#con_step2_lisMem_member_nation_${i}` : `#con_lisMem_member_nation_${i}`)
      .selectOption("中華民國");
    await page.evaluate(
      ({ i, birthday, isTaroko }) => {
        document.querySelector(
          isTaroko
            ? `input[name="ctl00$con$step2$lisMem$ctrl${i + 1}$member_birthday"]`
            : `input[name="ctl00$con$lisMem$ctrl${i + 1}$member_birthday"]`
        ).value = birthday;
      },
      { i, birthday, isTaroko }
    );

    if (isTaroko) {
      await page.locator(`#con_step2_lisMem_member_contactname_${i}`).fill(emergencyContactName);
      await page.locator(`#con_step2_lisMem_member_contacttel_${i}`).fill(emergencyContactPhone);
    } else {
      await page.getByLabel(label).getByRole("textbox", { name: "緊急聯絡人姓名" }).click();
      await page.waitForTimeout(2000);
      await page.getByLabel(label).getByRole("textbox", { name: "緊急聯絡人姓名" }).fill(emergencyContactName);
      await page
        .getByLabel(label)
        .getByRole("textbox", { name: isTaroko ? "緊急聯絡人電話或手機" : "緊急聯絡人電話" })
        .fill(emergencyContactPhone);
    }
  }

  /**
   *
   */
  await page.waitForTimeout(200);
  if (isTaroko) {
    await page.getByRole("button", { name: " 留守人資料 (請展開填寫資料)" }).click();
  } else {
    await page.getByRole("button", { name: "   留守人資料(請展開填寫資料)" }).click();
  }
  if (isTaroko) {
    await page.locator("#con_step2_stay_name").fill(watcher.name);
    await page.locator("#con_step2_stay_tel").fill(watcher.homePhone || watcher.mobilePhone);
    await page.locator("#con_step2_stay_mobile").fill(watcher.mobilePhone);
    await page.locator("#con_step2_stay_email").fill(watcher.email);
  } else {
    await page
      .getByLabel("留守人資料(請展開填寫資料)")
      .getByRole("textbox", { name: isYushan ? "請輸入姓名" : "留守人手機" })
      .fill(watcher.name);
    await page
      .getByLabel("留守人資料(請展開填寫資料)")
      .getByRole("textbox", { name: isYushan ? "請輸入手機(或電話)" : "留守人手機" })
      .fill(watcher.mobilePhone);
    if (!isYushan)
      await page.getByRole("textbox", { name: "留守人電話" }).fill(watcher.homePhone || watcher.mobilePhone);
    await page.locator("#con_stay_email").fill(watcher.email);
    await page.evaluate(
      ({ watcher }) => {
        document.querySelector('input[name="ctl00$con$stay_birthday"]').value = watcher.birthday;
      },
      { watcher }
    );
  }

  /**
   *
   */
  try {
    await page.locator("#con_cbOneMan").check();
  } catch (error) {}
  await page.locator("#con_btnToStep31").click();
  await page.evaluate(() => {
    document.documentElement.style.transform = "scale(0.5)";
    document.documentElement.style.transformOrigin = "top left";
  });

  /**
   *
   */
  // Wait for user to manually fill the code and press Enter in CLI
  await promptUserInput("請在網頁上手動輸入驗證碼，完成後請按 Enter 以繼續提交...\n");
  await submit(page);
}

apply().catch(console.error);
