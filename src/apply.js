const { chromium } = require("playwright");
const readline = require("readline");
const data = require("./application.json");

async function promptUserInput(promptText) {
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
}

async function apply() {
  const { org, route, numOfDays, plan, members, watcher } = data;
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
  page.once("dialog", (dialog) => {
    console.log(`Dialog message: ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
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
    "為維護安全並避免意外，請勿擅自進入三六九山莊施工工區，住宿請依規定申請三六九臨時營地。",
    "請注意，領隊及隊員名單如有外籍人士，請提醒攜帶具有GPS",
    "申請人應瞭解並填具所有正確的隊員資料與行程計畫。如明知為不實或冒用他人資料填載入園申請之事項，已構成刑法第 210 條偽造文書罪嫌，或構成刑法第 214",
    "欲申請雪山西稜線之隊伍，請於申請前詳閱230林道注意事項。",
    "園區內禁止使用器具以外之炊煮、燃火行為；於乾燥季節期間，特別提高防火警覺，嚴防森林火災。",
    "進入原住民族傳統領域須知： 1",
    "入園申請隊員若具有學生身分或參加學校社團活動，請務必自行通報學校相關單位，作為緊急應變之用。",
    "本人已閱讀並充分瞭解上述注意事項，並會遵守國家公園、警政署各項規定。",
  ];
  for (let i = 0; i < agreements.length; i++) {
    await page
      .getByRole("row", {
        name: agreements[i],
      })
      .getByRole("checkbox")
      .check();
  }
  await page.getByRole("button", { name: "同意", exact: true }).click();

  /**
   *
   */
  await page.getByRole("textbox", { name: "隊伍名稱" }).fill(`${leader.name}-${route}-${startDate}-${numOfDays}days`);
  await page.locator("#con_sumday").selectOption(String(numOfDays));
  await page.locator("#con_applystart").selectOption(startDate);
  for (let i = 0; i < plan.length; i++) {
    const day = plan[i];
    if (i > 0) await page.getByText(`第${i + 1}天行程`).waitFor({ state: "visible" });
    for (const spot of day.spots) {
      await page.getByRole("radio", { name: new RegExp(spot, "i") }).check();
    }
    await page.waitForTimeout(1000);
    await page.getByRole("link", { name: "  完成路線" }).click();
  }

  await page.getByText("請選擇下一個地點：").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "下一步" }).click();

  /**
   *
   */
  await page
    .getByRole("checkbox", {
      name: "請確認領隊或隊員同意委託申請人代理蒐集當事人個人資料，並委託其上網向國家公園管理處提出登山申請相關事宜，以免違反相關法令。",
    })
    .check();
  await page.getByRole("textbox", { name: "申請人姓名" }).fill(leader.name);
  await page.getByRole("textbox", { name: "申請人電話" }).fill(leader.homePhone || leader.mobilePhone);
  await page.locator("#con_ddlapply_country").selectOption({ label: leader.city });
  await page.locator("#con_ddlapply_city").selectOption({ label: leader.district });
  await page.getByRole("textbox", { name: "申請人地址" }).fill(leader.addressDetail);
  await page.getByRole("textbox", { name: "申請人手機" }).fill(leader.mobilePhone);
  await page.getByRole("textbox", { name: "申請人電子郵件" }).fill(leader.email);
  await page.locator("#con_apply_nation").selectOption("中華民國");
  await page.waitForLoadState("networkidle");
  await page.getByRole("textbox", { name: "申請人證號" }).fill(leader.idNumber);
  await page.evaluate(
    ({ leader }) => {
      document.querySelector('input[name="ctl00$con$apply_birthday"]').value = leader.birthday;
    },
    { leader }
  );
  await page.getByRole("textbox", { name: "緊急聯絡人姓名" }).fill(leader.emergencyContactName);
  await page.getByRole("textbox", { name: "緊急聯絡人電話" }).fill(leader.emergencyContactPhone);

  /**
   *
   */
  await page.getByRole("button", { name: "   領隊資料(請展開填寫資料)" }).click();
  await page.getByRole("checkbox", { name: "同申請人" }).check();

  /**
   *
   */
  await page.getByRole("button", { name: "   隊員資料(請展開填寫資料)" }).click();
  await page.locator("#con_member_keytype").check();
  await page.waitForLoadState("networkidle");

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
    await page.getByRole("link", { name: "  新增隊員" }).click();
    await page.getByLabel(label).getByRole("textbox", { name: "請輸入姓名" }).fill(name);
    await page.locator(`#con_lisMem_ddlmember_country_${i}`).selectOption({ label: city });
    await page.locator(`#con_lisMem_ddlmember_city_${i}`).selectOption({ label: district });
    await page.getByLabel(label).getByRole("textbox", { name: "請輸入地址" }).fill(addressDetail);
    if (homePhone) await page.getByLabel(label).getByRole("textbox", { name: "請輸入電話" }).fill(homePhone);
    await page.getByLabel(label).getByRole("textbox", { name: "請輸入手機" }).fill(mobilePhone);
    await page.getByLabel(label).getByRole("textbox", { name: "請輸入電子郵件" }).fill(email);
    await page.getByLabel(label).getByRole("textbox", { name: "請輸入證號" }).type(idNumber);
    await page.locator(`#con_lisMem_member_nation_${i}`).selectOption("中華民國");
    await page.evaluate(
      ({ i, birthday }) => {
        document.querySelector(`input[name="ctl00$con$lisMem$ctrl${i + 1}$member_birthday"]`).value = birthday;
      },
      { i, birthday }
    );
    await page.getByLabel(label).getByRole("textbox", { name: "緊急聯絡人姓名" }).fill(emergencyContactName);
    await page.getByLabel(label).getByRole("textbox", { name: "緊急聯絡人電話" }).fill(emergencyContactPhone);
  }

  /**
   *
   */
  await page.getByRole("button", { name: "   留守人資料(請展開填寫資料)" }).click();
  await page.getByRole("textbox", { name: "留守人姓名" }).fill(watcher.name);
  await page.getByRole("textbox", { name: "留守人電話" }).fill(watcher.homePhone || watcher.mobilePhone);
  await page.getByRole("textbox", { name: "留守人手機" }).fill(watcher.mobilePhone);
  await page.getByRole("textbox", { name: "留守人電子郵件" }).fill(watcher.email);
  await page.evaluate(
    ({ watcher }) => {
      document.querySelector('input[name="ctl00$con$stay_birthday"]').value = watcher.birthday;
    },
    { watcher }
  );

  /**
   *
   */
  await page.getByRole("button", { name: "下一步" }).click();
  await page.evaluate(() => {
    document.documentElement.style.transform = "scale(0.5)";
    document.documentElement.style.transformOrigin = "top left";
  });
}

apply().catch(console.error);
