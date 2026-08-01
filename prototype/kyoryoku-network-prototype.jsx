import React, { useState, useRef, useEffect } from "react";
import {
  Briefcase, FileText, Camera, Building2, Lock, ChevronLeft, Check, CheckCheck,
  Plus, Send, MapPin, Calendar, Banknote, ShieldCheck, Search, X, Trash2, Users,
  MessageSquare, Folder, ChevronRight, Star, Paperclip, SlidersHorizontal, HardHat, Globe
} from "lucide-react";

/* ── パレット：JIS安全色から ── */
const C = {
  sumi: "#14171C", kami: "#FFFFFF", yojo: "#E9EDEA", keisen: "#D6DBD7",
  ki: "#F5C518", midori: "#00874A", aka: "#D22630", usu: "#6B7280",
};
const FONT = "'Hiragino Kaku Gothic ProN','Hiragino Sans','Noto Sans JP',system-ui,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,monospace";
const yen = (n) => "¥" + (Number(n) || 0).toLocaleString("ja-JP");
const fmt = (iso) => iso ? `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}` : "—";
const range = (a, b) => `${fmt(a)}〜${fmt(b)}`;

const STATUS = ["募集中", "募集停止", "募集終了"];
/* 受注するとあなたが何次下請になるか。単価に直結するので必ず表示する */
const JISU = ["1次下請", "2次下請", "3次下請"];
const jisuColor = (j) => j === "1次下請" ? C.midori : j === "2次下請" ? C.usu : C.aka;
/* 「何次」ではなく「間に何社入るか」で見せる */
const jisuN = (j) => j === "1次下請" ? 0 : j === "2次下請" ? 1 : 2;
const statusColor = (s) => s === "募集中" ? C.midori : s === "募集停止" ? C.usu : C.aka;
const KEISHIKI = ["請負", "応援（常用）"];

/* プラン。カメラ・工事写真・黒板はどのプランでも無制限 */
const INF = Infinity;
const PLANS = {
  free: { key: "free", name: "無料",         short: "無料", price: 0,     detail: 3,   send: 1,  recv: "pt", scout: 1,  post: 1,   aki: 1,   site: 2,   gb: 1,   users: 1,  docs: false, info: 0 },
  std:  { key: "std",  name: "スタンダード", short: "スタ", price: 3000,  detail: INF, send: 5,  recv: INF,  scout: 5,  post: INF, aki: 3,   site: 5,   gb: 10,  users: 3,  docs: true,  info: 1 },
  pro:  { key: "pro",  name: "プロ",         short: "プロ", price: 5000,  detail: INF, send: 15, recv: INF,  scout: 15, post: INF, aki: 6,   site: 15,  gb: 50,  users: 10, docs: true,  info: 2 },
  prem: { key: "prem", name: "プレミアム",   short: "プレ", price: 10000, detail: INF, send: 40, recv: INF,  scout: 40, post: INF, aki: INF, site: INF, gb: INF, users: INF, docs: true, info: 3 },
};
const lim = (n) => n === INF ? "無制限" : String(n);

const SEED_JOBS = [
  { id: 1, name: "五井中央 共同住宅 外部足場", keishiki: "請負", gyoshu: "足場",
    area: "千葉県市原市", kibo: "1,240㎡", kokiA: "2026-09-01", kokiB: "2026-09-20",
    site: "市原市五井中央西2-1-8", mode: "指値", shizane: 1_860_000, kigen: "",
    saito: "翌月末", pub: false, jisu: "1次下請", hacchu: "京葉建設工業", level: "Gold",
    status: "募集中", posted: "2026-08-01", boshuA: "2026-08-01", boshuB: "2026-08-25" },
  { id: 2, name: "千住 戸建 外壁塗装", keishiki: "請負", gyoshu: "塗装",
    area: "東京都足立区", kibo: "780㎡", kokiA: "2026-09-08", kokiB: "2026-09-30",
    site: "足立区千住3-14-2", mode: "見積依頼", shizane: 0, kigen: "2026-08-20",
    saito: "翌々月10日", pub: false, jisu: "2次下請", hacchu: "北千住リフォーム", level: "Silver",
    status: "募集停止", posted: "2026-07-28", boshuA: "2026-07-28", boshuB: "2026-08-20" },
  { id: 3, name: "川口栄町 木造解体", keishiki: "請負", gyoshu: "解体",
    area: "埼玉県川口市", kibo: "木造2階 1棟", kokiA: "2026-10-01", kokiB: "2026-10-15",
    site: "川口市栄町3-2-11", mode: "指値", shizane: 2_400_000, kigen: "",
    saito: "翌月末", pub: false, jisu: "1次下請", hacchu: "彩北総業", level: "Platinum",
    status: "募集中", posted: "2026-08-05", boshuA: "2026-08-05", boshuB: "2026-09-10" },
  { id: 4, name: "船橋 現場応援（足場 常用）", keishiki: "応援（常用）", gyoshu: "足場",
    area: "千葉県船橋市", kibo: "", kokiA: "2026-08-25", kokiB: "2026-09-12",
    site: "船橋市浜町2-1-1", mode: "指値", shizane: 0, kigen: "",
    tanka: 22_000, ninzu: 3,
    saito: "翌月末", pub: false, jisu: "2次下請", hacchu: "湾岸工業", level: "Silver",
    status: "募集中", posted: "2026-08-10", boshuA: "2026-08-10", boshuB: "2026-08-22" },
  { id: 7, name: "市原市営住宅 外壁改修 仮設足場", keishiki: "請負", gyoshu: "足場",
    area: "千葉県市原市", kibo: "2,340㎡", kokiA: "2026-10-05", kokiB: "2026-11-14",
    site: "市原市辰巳台東3-1", mode: "指値", shizane: 3_420_000, kigen: "",
    saito: "翌月末", pub: true, jisu: "1次下請", hacchu: "京葉建設工業", level: "Gold",
    status: "募集中", posted: "2026-08-14", boshuA: "2026-08-14", boshuB: "2026-09-05" },
  { id: 6, name: "市川 倉庫 外部足場", keishiki: "請負", gyoshu: "足場",
    area: "千葉県市川市", kibo: "860㎡", kokiA: "2026-09-05", kokiB: "2026-09-18",
    site: "市川市塩浜2-1-1", mode: "見積依頼", shizane: 0, kigen: "2026-08-25",
    saito: "翌月末", pub: false, jisu: "1次下請", hacchu: "高橋工業", level: "Silver",
    status: "募集中", posted: "2026-08-08", boshuA: "2026-08-08", boshuB: "2026-08-24",
    applications: [
      { id: 1, company: "三和架設", gaku: 1_240_000, t: "8/12",
        msg: "9/5から4名で入れます。資材はこちらで手配できます。" },
      { id: 2, company: "東葛工業", gaku: 1_180_000, t: "8/13",
        msg: "同規模の倉庫を今年3件やっています。足場材は自社保有です。" },
      { id: 3, company: "城東解体工業", gaku: 1_350_000, t: "8/14",
        msg: "9/8以降であれば対応可能です。" },
    ] },
  { id: 5, name: "浦安 事務所ビル 内装解体", keishiki: "請負", gyoshu: "内装",
    area: "千葉県浦安市", kibo: "420㎡", kokiA: "2026-08-20", kokiB: "2026-08-31",
    site: "浦安市入船4-1-1", mode: "見積依頼", shizane: 0, kigen: "2026-07-25",
    saito: "翌月末", pub: false, jisu: "3次下請", hacchu: "東和内装", level: "Bronze",
    status: "募集終了", posted: "2026-07-10", boshuA: "2026-07-10", boshuB: "2026-07-31" },
];

const SEED_INBOX = [
  { id: 101, from: "京葉建設工業", kouji: "五井中央 共同住宅 外部足場", gaku: 1_860_000,
    koki: "9/1〜9/20", uke: false, date: "8/12", basho: "市原市五井中央西2-1-8" },
  { id: 102, from: "彩北総業", kouji: "川口栄町 木造解体", gaku: 2_400_000,
    koki: "10/1〜10/15", uke: true, date: "8/9", basho: "川口市栄町3-2-11" },
];

const SEED_PARTNERS = [
  { id: 1, name: "京葉建設工業", tanto: "佐藤", shime: "20日", shiharai: "翌月末", inapp: true, renraku: "" },
  { id: 2, name: "丸和塗装", tanto: "村上", shime: "末日", shiharai: "翌々月10日", inapp: false, renraku: "murakami@example.jp" },
  { id: 3, name: "彩北総業", tanto: "大野", shime: "末日", shiharai: "翌月末", inapp: true, renraku: "" },
  { id: 4, name: "大久保工務店", tanto: "大久保", shime: "末日", shiharai: "翌月20日", inapp: false, renraku: "okubo@example.jp" },
];

/* 受信するスカウト・見積依頼。無料でも届いて読める＝課金のきっかけ */
const SEED_INVITES = [
  { id: 201, type: "現場スカウト", from: "湾岸工業", jobId: 4, date: "8/13", read: false, aiteFree: false,
    text: "船橋の応援の件です。御社の対応エリアと工種が合っていたので声を掛けました。3人お願いできませんか。" },
  { id: 202, type: "見積依頼", from: "北千住リフォーム", jobId: 2, date: "8/13", read: false, aiteFree: true,
    text: "千住の外壁塗装、足場込みでお見積りをお願いできますか。提出期限は8/20です。" },
];

const SEED_THREADS = {
  "j1": [
    { me: false, text: "ご応募ありがとうございます。9/1着工で動けますか。", t: "8/12 10:24", read: false },
    { me: false, text: "現場の資料を送ります。", t: "8/12 10:25", read: false,
      file: { name: "配置図.pdf", type: "資料" } },
    { me: true, text: "問題ありません。搬入は前日夕方でも大丈夫でしょうか。", t: "8/12 11:02", read: true },
    { me: false, text: "前日16時以降でお願いします。ゲートは南側です。", t: "8/12 11:15", read: false },
  ],
  "c:三和架設": [
    { me: true, text: "はじめまして。9月に応援でお願いできる日はありますか。", t: "8/14 09:12", read: true },
  ],
};

/* プロフィールを充実させると、スカウト閲覧ポイントがもらえる */
const PROFILE_TASKS = [
  { id: "kaisha", label: "会社住所・代表者名・担当者名を登録する", pt: 1 },
  { id: "taiou", label: "対応エリア・対応職種を登録する", pt: 1 },
  { id: "hasshin", label: "案件を投稿する、またはスカウト・見積依頼を送る", pt: 1 },
];

/* 信用スコア：書類を出すほど上がる */
const TRUST_DOCS = [
  { id: "tohon",   label: "履歴事項全部証明書（謄本）", pt: 20 },
  { id: "kaigyo",  label: "開業届 または 定款",         pt: 10 },
  { id: "kyoka",   label: "建設業許可証",               pt: 15 },
  { id: "hoken",   label: "社会保険・労災の加入書類",   pt: 15 },
  { id: "baisho",  label: "請負業者賠償責任保険の証券", pt: 10 },
  { id: "invoice", label: "インボイス登録番号",         pt: 10 },
  { id: "ccus",    label: "CCUS事業者ID",               pt: 10 },
  { id: "hp",      label: "自社ホームページ・SNS",      pt: 5 },
];
const docPt = (ids) => TRUST_DOCS.filter((d) => ids.includes(d.id)).reduce((n, d) => n + d.pt, 0);
const levelOf = (n) => n >= 80 ? "Platinum" : n >= 60 ? "Gold" : n >= 40 ? "Silver" : n >= 20 ? "Bronze" : "未認証";
const RANK = { free: 0, std: 1, pro: 2, prem: 3 };

/* 色の意味を1箇所に固定する（凡例と実装を一致させる） */
const TONE = { action: "aka", active: "ki", done: "midori", off: "usu" };

/* 社内のロール。現場担当には金額を見せない */
const ROLES = {
  owner:      { key: "owner",      name: "代表者",     amount: true,  issue: true,  approve: true,  report: true },
  accounting: { key: "accounting", name: "経理・事務", amount: true,  issue: true,  approve: false, report: false },
  field:      { key: "field",      name: "現場担当",   amount: false, issue: false, approve: false, report: true },
};

/* 会社台帳。プランに応じて見える範囲が変わる */
const COMPANIES = {
  "京葉建設工業": { url: "https://keiyo-kensetsu.example.jp", rep: "佐藤 健一", est: "2005年", area: "千葉県市原市", gyoshu: "土木・建築",
    kyoka: "千葉県知事 般-2 第00812号", docs: ["tohon", "kyoka", "hoken", "baisho", "invoice", "hp"],
    torihiki: 28, hacchu: 48, jusyu: 12, ontime: 46, delay: 2, stars: 4.3 },
  "彩北総業": { url: "https://saihoku.example.jp", rep: "大野 誠", est: "1998年", area: "埼玉県川口市", gyoshu: "解体・土木",
    kyoka: "埼玉県知事 特-3 第01199号", docs: ["tohon", "kyoka", "hoken", "baisho", "invoice", "ccus", "hp"],
    torihiki: 41, hacchu: 71, jusyu: 8, ontime: 71, delay: 0, stars: 4.8 },
  "北千住リフォーム": { url: "https://kitasenju-reform.example.jp", rep: "石川 由美", est: "2019年", area: "東京都足立区", gyoshu: "塗装・内装",
    kyoka: "登録なし（500万円未満のみ）", docs: ["kaigyo", "hp"],
    torihiki: 6, hacchu: 9, jusyu: 2, ontime: 6, delay: 3, stars: 2.9 },
  "湾岸工業": { url: "https://wangan.example.jp", rep: "森 拓也", est: "2012年", area: "千葉県船橋市", gyoshu: "足場",
    kyoka: "千葉県知事 般-4 第02233号", docs: ["tohon", "kyoka", "hoken", "invoice"],
    torihiki: 15, hacchu: 22, jusyu: 19, ontime: 20, delay: 2, stars: 3.9 },
  "東和内装": { rep: "内田 亮", est: "2021年", area: "千葉県浦安市", gyoshu: "内装",
    kyoka: "登録なし（500万円未満のみ）", docs: ["kaigyo"],
    torihiki: 3, hacchu: 4, jusyu: 1, ontime: 3, delay: 1, stars: 3.1 },
  "三和架設": { url: "https://sanwa-kasetsu.example.jp", rep: "山口 剛", est: "2010年", area: "千葉県船橋市", gyoshu: "足場",
    kyoka: "千葉県知事 般-3 第01820号", docs: ["tohon", "kyoka", "hoken", "baisho", "ccus"],
    torihiki: 22, hacchu: 5, jusyu: 34, ontime: 5, delay: 0, stars: 4.5 },
  "丸和塗装": { url: "https://maruwa-tosou.example.jp", rep: "村上 直人", est: "2016年", area: "東京都足立区", gyoshu: "塗装",
    kyoka: "東京都知事 般-5 第03310号", docs: ["tohon", "kyoka", "hoken"],
    torihiki: 11, hacchu: 2, jusyu: 18, ontime: 2, delay: 0, stars: 4.0 },
  "城東解体工業": { rep: "高木 修", est: "2020年", area: "東京都江戸川区", gyoshu: "解体",
    kyoka: "登録なし（500万円未満のみ）", docs: ["kaigyo", "hoken"],
    torihiki: 4, hacchu: 1, jusyu: 6, ontime: 1, delay: 0, stars: 3.4 },
  "松本内装": { rep: "松本 康", est: "2014年", area: "埼玉県草加市", gyoshu: "内装",
    kyoka: "埼玉県知事 般-4 第02901号", docs: ["tohon", "kyoka", "hoken", "invoice"],
    torihiki: 9, hacchu: 3, jusyu: 14, ontime: 3, delay: 0, stars: 4.1 },
  "東葛工業": { url: "https://tokatsu.example.jp", rep: "斉藤 洋", est: "2001年", area: "千葉県柏市", gyoshu: "足場・とび",
    kyoka: "千葉県知事 特-2 第00455号", docs: ["tohon", "kyoka", "hoken", "baisho", "invoice", "ccus", "hp"],
    torihiki: 37, hacchu: 12, jusyu: 52, ontime: 12, delay: 0, stars: 4.7 },
};

/* 空き情報＝手が空いている側からの投稿。人工の空きと工事枠の空き */
const AKI_TYPES = ["人工の空き", "工事枠の空き"];
const SEED_AKI = [
  { id: 1, company: "三和架設", gyoshu: "足場", area: "千葉県船橋市", type: "人工の空き",
    from: "2026-09-01", to: "2026-09-25", ninzu: 3, tanka: 23_000, level: "Gold", posted: "2026-08-12",
    note: "3名空いています。市原・船橋周辺なら即日対応できます。" },
  { id: 2, company: "丸和塗装", gyoshu: "塗装", area: "東京都足立区", type: "工事枠の空き",
    from: "2026-09-01", to: "2026-09-30", ninzu: 0, level: "Silver", posted: "2026-08-10",
    note: "9月の塗装工事を募集しています。戸建・アパートどちらも対応します。" },
  { id: 3, company: "城東解体工業", gyoshu: "解体", area: "東京都江戸川区", type: "人工の空き",
    from: "2026-08-25", to: "2026-09-05", ninzu: 2, tanka: 20_000, level: "Bronze", posted: "2026-08-13",
    note: "2名手が空きます。木造・内装解体に対応できます。" },
];

/* 会社ページ。開示範囲はプランで段階的に広がる */
const SEED_COMPANIES = {
  "京葉建設工業": { gyoshu: "総合建設", area: "千葉県市原市", level: "Gold", since: "2003年", nin: "従業員42名",
    kyoka: "千葉県知事 特-2 第55512号", hoken: "健保・厚年・雇用 加入済", ccus: "登録あり",
    hacchu: 128, jucchu: 14, star: 4.2, kijitsu: 124, chien: 4, saito: "平均 41日" },
  "彩北総業": { gyoshu: "解体・土木", area: "埼玉県川口市", level: "Platinum", since: "1996年", nin: "従業員68名",
    kyoka: "埼玉県知事 特-1 第31208号", hoken: "健保・厚年・雇用 加入済", ccus: "登録あり",
    hacchu: 240, jucchu: 8, star: 4.7, kijitsu: 239, chien: 1, saito: "平均 33日" },
  "北千住リフォーム": { gyoshu: "リフォーム", area: "東京都足立区", level: "Silver", since: "2016年", nin: "従業員9名",
    kyoka: "東京都知事 般-5 第12094号", hoken: "健保・厚年・雇用 加入済", ccus: "登録なし",
    hacchu: 37, jucchu: 3, star: 3.4, kijitsu: 31, chien: 6, saito: "平均 58日" },
  "湾岸工業": { gyoshu: "足場", area: "千葉県船橋市", level: "Silver", since: "2011年", nin: "従業員21名",
    kyoka: "千葉県知事 般-3 第44120号", hoken: "健保・厚年・雇用 加入済", ccus: "登録あり",
    hacchu: 64, jucchu: 52, star: 3.9, kijitsu: 60, chien: 4, saito: "平均 45日" },
  "東和内装": { gyoshu: "内装", area: "千葉県浦安市", level: "Bronze", since: "2020年", nin: "従業員5名",
    kyoka: "千葉県知事 般-6 第60881号", hoken: "健保・厚年 加入済", ccus: "登録なし",
    hacchu: 12, jucchu: 19, star: 3.1, kijitsu: 9, chien: 3, saito: "平均 63日" },
  "三和架設": { gyoshu: "足場", area: "千葉県船橋市", level: "Gold", since: "2008年", nin: "職人11名",
    kyoka: "千葉県知事 般-4 第38771号", hoken: "健保・厚年・雇用 加入済", ccus: "登録あり",
    hacchu: 9, jucchu: 143, star: 4.4, kijitsu: 141, chien: 2, saito: "—" },
  "丸和塗装": { gyoshu: "塗装", area: "東京都足立区", level: "Silver", since: "2014年", nin: "職人6名",
    kyoka: "東京都知事 般-5 第20915号", hoken: "健保・厚年・雇用 加入済", ccus: "登録なし",
    hacchu: 4, jucchu: 88, star: 3.8, kijitsu: 86, chien: 2, saito: "—" },
  "城東解体工業": { gyoshu: "解体", area: "東京都江戸川区", level: "Bronze", since: "2021年", nin: "職人4名",
    kyoka: "東京都知事 般-6 第61330号", hoken: "健保・厚年 加入済", ccus: "登録なし",
    hacchu: 2, jucchu: 31, star: 3.2, kijitsu: 30, chien: 1, saito: "—" },
  "松本内装": { gyoshu: "内装", area: "埼玉県草加市", level: "Silver", since: "2017年", nin: "職人5名",
    kyoka: "埼玉県知事 般-5 第52007号", hoken: "健保・厚年・雇用 加入済", ccus: "登録あり",
    hacchu: 1, jucchu: 46, star: 3.7, kijitsu: 45, chien: 1, saito: "—" },
  "東葛工業": { gyoshu: "足場", area: "千葉県柏市", level: "Platinum", since: "1999年", nin: "職人18名",
    kyoka: "千葉県知事 特-2 第29344号", hoken: "健保・厚年・雇用 加入済", ccus: "登録あり",
    hacchu: 22, jucchu: 210, star: 4.8, kijitsu: 209, chien: 1, saito: "—" },
};
const companyOf = (name) => SEED_COMPANIES[name] || {
  gyoshu: "—", area: "—", level: "未認証", since: "—", nin: "—",
  kyoka: "—", hoken: "—", ccus: "—",
  hacchu: 0, jucchu: 0, star: 0, kijitsu: 0, chien: 0, saito: "—",
};

/* ── 取引：注文書 → 請書 → 作業日報 → 請求（何度でも）→ 完了申請・承認 ── */
const TX_STATUS = ["請書待ち", "進行中", "完了申請中", "完了"];
const INV_STEPS = ["提出済", "承認済", "支払済", "入金済"];

const SEED_TX = [
  { id: 1, role: "uke", partner: "京葉建設工業", kouji: "五井中央 共同住宅 外部足場",
    convKey: "j1", jobId: 1, status: "進行中", shime: "20日", shiharai: "翌月末",
    orders: [
      { id: 1, no: 1, keishiki: "請負", gaku: 1_860_000, tanka: 0, kokiA: "2026-09-01", kokiB: "2026-09-20",
        basho: "市原市五井中央西2-1-8", note: "本工事", t: "8/12", ukesho: "8/13" },
      { id: 2, no: 2, keishiki: "請負", gaku: 240_000, tanka: 0, kokiA: "2026-09-10", kokiB: "2026-09-14",
        basho: "市原市五井中央西2-1-8", note: "追加：north面のハネ出し", t: "9/8", ukesho: null },
    ],
    reports: [
      { id: 1, date: "2026-09-01", ninzu: 4, naiyou: "資材搬入、北面の建地建て込み", note: "晴れ" },
      { id: 2, date: "2026-09-02", ninzu: 4, naiyou: "東西面の組立、メッシュシート張り", note: "" },
      { id: 3, date: "2026-09-03", ninzu: 3, naiyou: "南面の組立、昇降階段の設置", note: "午後から小雨" },
    ],
    invoices: [
      { id: 1, orderId: 1, gaku: 1_200_000, kind: "任意", due: "2026-09-30",
        state: "入金済", paidOn: "2026-09-28", t: "9/20" },
    ],
    requests: [],
    log: [] },
  { id: 2, role: "uke", partner: "彩北総業", kouji: "川口栄町 木造解体",
    convKey: "j3", jobId: 3, status: "請書待ち", shime: "末日", shiharai: "翌月末",
    orders: [
      { id: 1, no: 1, keishiki: "請負", gaku: 2_400_000, tanka: 0, kokiA: "2026-10-01", kokiB: "2026-10-15",
        basho: "川口市栄町3-2-11", note: "近隣説明が済み次第の着工", t: "8/9", ukesho: null },
    ],
    reports: [], invoices: [], requests: [], log: [] },
  { id: 3, role: "moto", partner: "丸和塗装", kouji: "浦安 事務所ビル 内装（応援）",
    convKey: "c:丸和塗装", jobId: null, status: "進行中", shime: "末日", shiharai: "翌々月10日",
    orders: [
      { id: 1, no: 1, keishiki: "人工", gaku: 0, tanka: 22_000, kokiA: "2026-08-20", kokiB: "2026-08-31",
        basho: "浦安市入船4-1-1", note: "常用での応援", t: "8/2", ukesho: "8/3" },
    ],
    reports: [
      { id: 1, date: "2026-08-20", ninzu: 2, naiyou: "養生、既存内装の撤去", note: "" },
      { id: 2, date: "2026-08-21", ninzu: 3, naiyou: "天井・間仕切りの解体", note: "" },
      { id: 3, date: "2026-08-25", ninzu: 3, naiyou: "残材搬出、清掃", note: "" },
    ],
    invoices: [],
    requests: [{ id: 1, naiyou: "3階部分の追加解体", gaku: 90_000,
      kokiA: "2026-08-28", kokiB: "2026-08-31", t: "8/26", status: "依頼中" }],
    log: [] },
];

const ninkuByMonth = (reports) => {
  const m = {};
  reports.forEach((r) => {
    const k = (r.date || "").slice(0, 7);
    if (k) m[k] = (m[k] || 0) + (Number(r.ninzu) || 0);
  });
  return Object.entries(m).sort();
};
const monthLabel = (k) => `${Number(k.slice(5, 7))}月`;

const txTotal = (tx) => tx.orders.reduce((n, o) => n + (o.keishiki === "人工" ? 0 : o.gaku), 0);
const orderBilled = (tx, oid) => tx.invoices.filter((v) => v.orderId === oid).reduce((n, v) => n + v.gaku, 0);
const invBilled = (tx) => tx.invoices.filter((v) => v.state !== "却下")
  .reduce((n, v) => n + v.gaku, 0);
const invOntime = (tx) => tx.invoices.filter((v) => v.state === "入金済" && v.paidOn && v.paidOn <= v.due).length;
const invLate = (tx) => tx.invoices.filter((v) => v.state === "入金済" && v.paidOn && v.paidOn > v.due).length;

/* 支払いの状態。遅延は「確定」したものだけが信用情報に載る *//* 支払いの状態。遅延は「確定」したものだけが信用情報に載る */
const PAY_FLOW = [
  "期日超過を検知",
  "相手に確認を依頼",
  "相手の回答",
  "事実確認",
  "記録",
];
const SEED_PAYMENTS = [
  { id: 1, role: "seller", partner: "北千住リフォーム", kouji: "千住 戸建外壁塗装",
    gaku: 1_120_000, due: "2026-07-31", status: "期日超過", over: 12, log: [] },
  { id: 2, role: "seller", partner: "京葉建設工業", kouji: "五井中央 外部足場（出来高）",
    gaku: 900_000, due: "2026-08-31", status: "期日前", over: 0, log: [] },
  { id: 3, role: "buyer", partner: "丸和塗装", kouji: "浦安 内装解体 応援",
    gaku: 340_000, due: "2026-08-20", status: "確認依頼が届いています", over: 3,
    log: [{ t: "8/23", text: "丸和塗装から入金確認の依頼が届きました" }] },
];
const payTone = (st) =>
  st === "遅延として記録" ? "aka"
  : st === "解決（記録なし）" ? "midori"
  : st === "期日前" ? "plain" : "ki";

/* スカウトを送る相手（協力業者） */
const SEED_GYOSHA = [
  { id: 1, name: "丸和塗装", gyoshu: "塗装", area: "東京都足立区", level: "Silver", jinin: "職人6名" },
  { id: 2, name: "三和架設", gyoshu: "足場", area: "千葉県船橋市", level: "Gold", jinin: "職人11名" },
  { id: 3, name: "城東解体工業", gyoshu: "解体", area: "東京都江戸川区", level: "Bronze", jinin: "職人4名" },
  { id: 4, name: "松本内装", gyoshu: "内装", area: "埼玉県草加市", level: "Silver", jinin: "職人5名" },
  { id: 5, name: "東葛工業", gyoshu: "足場", area: "千葉県柏市", level: "Platinum", jinin: "職人18名" },
];

const KOUTEI = ["着手前", "施工中", "施工後", "完了検査"];
const KOUSHU_YOKU = ["外部足場", "外壁塗装", "解体", "内装", "基礎", "屋根"];

/* ── 部品 ── */
function DenpyoCard({ children, tone = "plain" }) {
  const bar = { plain: C.keisen, ki: C.ki, midori: C.midori, aka: C.aka, usu: C.usu }[tone];
  return (
    <div className="relative overflow-hidden mb-3"
      style={{ background: C.kami, border: `1px solid ${C.keisen}`, borderRadius: 6 }}>
      <div className="absolute left-0 top-0 bottom-0" style={{ width: 10, background: bar }} />
      <div className="absolute top-0 bottom-0" style={{
        left: 10, width: 8,
        backgroundImage: `radial-gradient(circle at 4px 5px, ${C.yojo} 2.2px, transparent 2.4px)`,
        backgroundSize: "8px 11px",
      }} />
      <div style={{ paddingLeft: 26 }} className="pr-3 py-3">{children}</div>
    </div>
  );
}

function Chip({ children, color = C.usu, solid = false }) {
  return (
    <span className="inline-block text-[11px] px-2 py-[3px] rounded-sm font-bold" style={{
      color: solid ? "#fff" : color, background: solid ? color : "transparent",
      border: solid ? "none" : `1px solid ${color}`,
    }}>{children}</span>
  );
}

function Row({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex items-start gap-2 py-[3px]">
      {Icon && <Icon size={13} style={{ color: C.usu, marginTop: 3, flexShrink: 0 }} />}
      <span className="text-[12px] w-16 flex-shrink-0" style={{ color: C.usu }}>{label}</span>
      <span className="text-[13px] font-medium" style={{
        color: C.sumi, fontFamily: mono ? MONO : FONT, fontVariantNumeric: "tabular-nums",
      }}>{value}</span>
    </div>
  );
}

function Locked({ label, onOpen }) {
  return (
    <button onClick={onOpen} className="flex items-center gap-2 w-full text-left py-[3px]">
      <Lock size={13} style={{ color: C.usu, flexShrink: 0 }} />
      <span className="text-[12px] w-16 flex-shrink-0" style={{ color: C.usu }}>{label}</span>
      <span className="text-[12px] font-bold px-2 py-[2px] rounded-sm"
        style={{ background: C.ki, color: C.sumi }}>有料プランで表示</span>
    </button>
  );
}

function Header({ title, back, right, onTitle }) {
  return (
    <div className="sticky top-0 z-20 flex items-center gap-2 px-3 h-14" style={{ background: C.sumi }}>
      {back && <button onClick={back} className="-ml-1 p-1" aria-label="戻る">
        <ChevronLeft size={22} color="#fff" /></button>}
      {onTitle ? (
        <button onClick={onTitle} className="flex-1 min-w-0 text-left">
          <h1 className="text-[16px] font-extrabold truncate flex items-center gap-1" style={{ color: "#fff" }}>
            {title}<ChevronRight size={16} style={{ color: C.ki, flexShrink: 0 }} />
          </h1>
        </button>
      ) : (
        <h1 className="text-[17px] font-extrabold flex-1 truncate" style={{ color: "#fff" }}>{title}</h1>
      )}
      {right}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", hint }) {
  return (
    <label className="block mb-3">
      <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>{label}</span>
      <input type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-[15px] outline-none"
        style={{ background: C.kami, border: `1px solid ${C.keisen}`, borderRadius: 4, color: C.sumi }} />
      {hint && <span className="block text-[11px] mt-1" style={{ color: C.usu }}>{hint}</span>}
    </label>
  );
}

function DateRange({ label, a, b, onA, onB }) {
  return (
    <div className="mb-3">
      <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>{label}</span>
      <div className="flex items-center gap-2">
        <input type="date" value={a} onChange={(e) => onA(e.target.value)}
          className="flex-1 px-2 py-2 text-[14px] outline-none"
          style={{ background: C.kami, border: `1px solid ${C.keisen}`, borderRadius: 4, color: C.sumi }} />
        <span className="text-[13px]" style={{ color: C.usu }}>〜</span>
        <input type="date" value={b} onChange={(e) => onB(e.target.value)}
          className="flex-1 px-2 py-2 text-[14px] outline-none"
          style={{ background: C.kami, border: `1px solid ${C.keisen}`, borderRadius: 4, color: C.sumi }} />
      </div>
    </div>
  );
}

function Btn({ children, onClick, tone = "sumi", disabled }) {
  const bg = { sumi: C.sumi, ki: C.ki, midori: C.midori, aka: C.aka }[tone];
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full py-3 text-[15px] font-extrabold rounded-sm disabled:opacity-40"
      style={{ background: bg, color: tone === "ki" ? C.sumi : "#fff" }}>{children}</button>
  );
}

function Confirm({ title, note, rows, okLabel, onOk, onCancel, doc, check }) {
  const [agreed, setAgreed] = useState(false);
  const ready = !check || agreed;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto"
      style={{ background: "rgba(20,23,28,.55)" }}>
      <div className="w-full max-w-md p-3" style={{ background: C.kami, borderTop: `4px solid ${C.ki}` }}>
        <div className="text-[16px] font-extrabold mb-1" style={{ color: C.sumi }}>{title}</div>
        <p className="text-[12px] mb-3" style={{ color: C.usu }}>{note}</p>
        {doc && (
          <div className="p-3 mb-3 rounded-sm" style={{ background: C.kami, border: `2px solid ${C.midori}` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <FileText size={15} style={{ color: C.midori }} />
              <span className="text-[13px] font-extrabold" style={{ color: C.sumi }}>{doc.name}</span>
            </div>
            {doc.rows.map(([k, v], i) => (
              <div key={i} className="flex gap-2 py-[3px]">
                <span className="text-[12px] w-20 flex-shrink-0" style={{ color: C.usu }}>{k}</span>
                <span className="text-[13px] font-bold" style={{ color: C.sumi, fontFamily: MONO }}>{v}</span>
              </div>
            ))}
          </div>
        )}
        <div className="p-3 mb-3 rounded-sm" style={{ background: C.yojo }}>
          {rows.map(([k, v], i) => (
            <div key={i} className="flex gap-2 py-[3px]">
              <span className="text-[12px] w-20 flex-shrink-0" style={{ color: C.usu }}>{k}</span>
              <span className="text-[13px] font-bold" style={{ color: C.sumi, fontFamily: MONO }}>{v}</span>
            </div>
          ))}
        </div>
        {check && (
          <button onClick={() => setAgreed(!agreed)}
            className="flex items-start gap-2 w-full text-left p-3 mb-3 rounded-sm"
            style={{ background: agreed ? C.kami : C.yojo, border: `2px solid ${agreed ? C.midori : C.keisen}` }}>
            <span className="rounded-sm flex items-center justify-center flex-shrink-0"
              style={{ width: 20, height: 20, marginTop: 1,
                background: agreed ? C.midori : C.kami, border: `2px solid ${agreed ? C.midori : C.keisen}` }}>
              {agreed && <Check size={14} color="#fff" strokeWidth={3} />}
            </span>
            <span className="text-[13px] font-bold" style={{ color: C.sumi }}>{check}</span>
          </button>
        )}
        <Btn tone="ki" disabled={!ready} onClick={onOk}>{okLabel}</Btn>
        <button onClick={onCancel} className="w-full py-3 mt-2 text-[14px] font-bold"
          style={{ color: C.usu }}>戻って直す</button>
      </div>
    </div>
  );
}

function Legend({ items, open, onClick }) {
  return (
    <div className="mb-3">
      <button onClick={onClick} className="flex items-center gap-1.5 text-[11px] font-bold"
        style={{ color: C.usu }}>
        <span className="flex gap-[3px]">
          {items.map(([c], i) => (
            <span key={i} className="rounded-sm" style={{ width: 10, height: 10, background: c }} />
          ))}
        </span>
        色の意味 {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className="mt-2 p-2 rounded-sm" style={{ background: C.kami, border: `1px solid ${C.keisen}` }}>
          {items.map(([c, label], i) => (
            <div key={i} className="flex items-center gap-2 py-[3px]">
              <span className="rounded-sm flex-shrink-0" style={{ width: 12, height: 12, background: c }} />
              <span className="text-[12px]" style={{ color: C.sumi }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MineHead({ open, n, onClick, label }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2.5 mb-3 rounded-sm"
      style={{ background: C.sumi }}>
      <span className="text-[13px] font-extrabold" style={{ color: C.ki }}>{label}</span>
      <span className="text-[11px] font-bold px-1.5 py-[2px] rounded-sm"
        style={{ background: C.ki, color: C.sumi }}>{n}件</span>
      <span className="flex-1" />
      <span className="text-[13px] font-extrabold" style={{ color: C.ki }}>{open ? "▲" : "▼"}</span>
    </button>
  );
}

function Gate({ ok, need, children }) {
  if (ok) return children;
  return (
    <div className="flex items-center gap-2 py-4 px-3 rounded-sm"
      style={{ background: C.yojo, border: `1px dashed ${C.keisen}` }}>
      <Lock size={16} style={{ color: C.usu, flexShrink: 0 }} />
      <span className="text-[12px]" style={{ color: C.usu }}>{need}プラン以上で表示されます</span>
    </div>
  );
}

function Stars({ n }) {
  return (
    <div className="flex items-center gap-[2px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={16} strokeWidth={2}
          style={{ color: i <= Math.round(n) ? C.ki : C.keisen }}
          fill={i <= Math.round(n) ? C.ki : "none"} />
      ))}
      <span className="text-[14px] font-extrabold ml-1" style={{ color: C.sumi, fontFamily: MONO }}>
        {n.toFixed(1)}
      </span>
    </div>
  );
}

function Pills({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} className="text-[12px] px-2.5 py-1 rounded-sm font-bold"
          style={{
            background: value === o ? C.sumi : C.kami, color: value === o ? "#fff" : C.usu,
            border: `1px solid ${value === o ? C.sumi : C.keisen}`,
          }}>{o}</button>
      ))}
    </div>
  );
}

function Radio({ options, value, onChange }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length},1fr)` }}>
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)}
          className="py-2.5 text-[13px] font-extrabold rounded-sm flex items-center justify-center gap-1.5"
          style={{
            background: value === o ? C.ki : C.kami, color: C.sumi,
            border: `1px solid ${value === o ? C.ki : C.keisen}`,
          }}>
          <span className="rounded-full flex items-center justify-center"
            style={{ width: 15, height: 15, border: `2px solid ${value === o ? C.sumi : C.keisen}` }}>
            {value === o && <span className="rounded-full" style={{ width: 7, height: 7, background: C.sumi }} />}
          </span>
          {o}
        </button>
      ))}
    </div>
  );
}

/* ── 黒板 ── */
const boardLines = (b) => [
  ["工事名", b.kouji || "—"],
  ["工　種", b.koushu || "—"],
  ["工　程", b.koutei || "—"],
  ["撮影箇所", b.basho || "—"],
  ["撮影日", new Date().toLocaleDateString("ja-JP")],
];

function burnBoard(x, W, H, b) {
  const bw = W * 0.54, bh = H * 0.42, bx = W * 0.03, by = H - bh - H * 0.035;
  x.fillStyle = "#1E3A2F"; x.fillRect(bx, by, bw, bh);
  x.strokeStyle = "#E8E3D3"; x.lineWidth = 2; x.strokeRect(bx + 4, by + 4, bw - 8, bh - 8);
  x.font = `bold ${Math.round(bh * 0.115)}px ${FONT}`;
  boardLines(b).forEach(([k, v], i) => {
    const ty = by + bh * 0.19 + i * (bh * 0.155);
    x.fillStyle = "#B9CFC2"; x.fillText(k, bx + 14, ty);
    x.fillStyle = "#F2EFE4"; x.fillText(String(v).slice(0, 14), bx + bw * 0.34, ty);
  });
}

function BoardOverlay({ b }) {
  return (
    <div className="absolute pointer-events-none" style={{
      left: "3%", bottom: "3.5%", width: "54%",
      background: "#1E3A2F", border: "2px solid #E8E3D3", padding: "6px 8px",
    }}>
      {boardLines(b).map(([k, v], i) => (
        <div key={i} className="flex gap-1" style={{ lineHeight: 1.5 }}>
          <span className="text-[9px] font-bold" style={{ color: "#B9CFC2", width: "34%" }}>{k}</span>
          <span className="text-[9px] font-bold truncate" style={{ color: "#F2EFE4" }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

/* 写真ファイルに黒板を焼き込む */
function burnFile(file, b, done) {
  const r = new FileReader();
  r.onload = () => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement("canvas");
      cv.width = img.width; cv.height = img.height;
      const x = cv.getContext("2d");
      x.drawImage(img, 0, 0);
      burnBoard(x, cv.width, cv.height, b);
      done(cv.toDataURL("image/jpeg", 0.9));
    };
    img.src = r.result;
  };
  r.readAsDataURL(file);
}

function LiveCamera({ b, onCapture, onClose }) {
  const vRef = useRef(null), sRef = useRef(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let dead = false;
    const md = navigator.mediaDevices;
    if (!md?.getUserMedia) { setErr("この画面ではカメラを直接開けません。"); return; }
    md.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((s) => {
        if (dead) { s.getTracks().forEach((t) => t.stop()); return; }
        sRef.current = s;
        if (vRef.current) { vRef.current.srcObject = s; vRef.current.play?.(); }
      })
      .catch(() => setErr("この画面ではカメラを直接開けません。"));
    return () => { dead = true; sRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const shoot = () => {
    const v = vRef.current; if (!v || !v.videoWidth) return;
    const cv = document.createElement("canvas");
    cv.width = v.videoWidth; cv.height = v.videoHeight;
    const x = cv.getContext("2d");
    x.drawImage(v, 0, 0, cv.width, cv.height);
    burnBoard(x, cv.width, cv.height, b);
    onCapture(cv.toDataURL("image/jpeg", 0.9));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#000" }}>
      <div className="flex items-center justify-between px-3 h-14">
        <button onClick={onClose} className="p-1" aria-label="閉じる"><X size={24} color="#fff" /></button>
        <span className="text-[13px] font-bold" style={{ color: C.ki }}>{b.koushu}／{b.koutei}</span>
        <span style={{ width: 26 }} />
      </div>

      {err ? (
        <div className="flex-1 flex flex-col justify-center px-6">
          <p className="text-[14px] mb-1" style={{ color: "#fff" }}>{err}</p>
          <p className="text-[12px] mb-5" style={{ color: "rgba(255,255,255,.6)" }}>
            プレビュー枠の制限です。端末のカメラを開けば同じように黒板が入ります。
          </p>
          <label className="w-full py-3 rounded-sm text-[15px] font-extrabold text-center cursor-pointer block"
            style={{ background: C.ki, color: C.sumi }}>
            端末のカメラで撮る
            <input type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) burnFile(f, b, onCapture); }} />
          </label>
          <label className="w-full mt-2 py-3 rounded-sm text-[15px] font-extrabold text-center cursor-pointer block"
            style={{ background: "rgba(255,255,255,.12)", color: "#fff" }}>
            保存済みの写真を選ぶ
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) burnFile(f, b, onCapture); }} />
          </label>
        </div>
      ) : (
        <>
          <div className="flex-1 relative flex items-center justify-center">
            <div className="relative w-full">
              <video ref={vRef} playsInline muted className="w-full"
                style={{ maxHeight: "70vh", objectFit: "cover" }} />
              <BoardOverlay b={b} />
            </div>
          </div>
          <div className="pb-10 flex justify-center">
            <button onClick={shoot} aria-label="撮影" className="rounded-full"
              style={{ width: 74, height: 74, background: "#fff", border: `5px solid ${C.ki}` }} />
          </div>
        </>
      )}
    </div>
  );
}

function BoardPreview({ b }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const x = cv.getContext("2d"); const W = cv.width, H = cv.height;
    const sky = x.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#9BB6C9"); sky.addColorStop(1, "#C8D2D6");
    x.fillStyle = sky; x.fillRect(0, 0, W, H);
    x.fillStyle = "#8A8F8B"; x.fillRect(0, H * 0.72, W, H * 0.28);
    x.fillStyle = "#DAD6CC"; x.fillRect(W * 0.18, H * 0.2, W * 0.6, H * 0.52);
    x.strokeStyle = "rgba(40,44,48,.55)"; x.lineWidth = 3;
    for (let i = 0; i <= 6; i++) {
      const px = W * 0.16 + (W * 0.64 / 6) * i;
      x.beginPath(); x.moveTo(px, H * 0.16); x.lineTo(px, H * 0.74); x.stroke();
    }
    for (let j = 0; j <= 3; j++) {
      const py = H * 0.16 + (H * 0.58 / 3) * j;
      x.beginPath(); x.moveTo(W * 0.16, py); x.lineTo(W * 0.8, py); x.stroke();
    }
    burnBoard(x, W, H, b);
  }, [b.kouji, b.koushu, b.koutei, b.basho]);
  return <canvas ref={ref} width={640} height={420} className="w-full rounded-sm"
    style={{ border: `1px solid ${C.keisen}` }} />;
}

export default function App() {
  const [tab, setTab] = useState("jobs");
  const [plan, setPlan] = useState("free");
  const [role, setRole] = useState("owner");
  const [stance, setStance] = useState("uke");     // 受注側／発注側／両方
  const [opened, setOpened] = useState([]);        // 解放済みタブ
  const [showAll, setShowAll] = useState(false);   // デモ：全部見る
  const L = PLANS[plan];
  const paid = plan !== "free";
  const [jobs, setJobs] = useState(SEED_JOBS);
  const [jobOpen, setJobOpen] = useState(null);
  const [docTab, setDocTab] = useState("tx");
  const [inbox, setInbox] = useState(SEED_INBOX);
  const [issued, setIssued] = useState([]);
  const [compose, setCompose] = useState(null);
  const [composeJob, setComposeJob] = useState(null);
  const [form, setForm] = useState({ aite: "", kouji: "", basho: "", koki: "", gaku: "" });

  /* 現場フォルダ */
  const [sites, setSites] = useState([]);
  const [siteOpen, setSiteOpen] = useState(null);
  const [siteNew, setSiteNew] = useState(false);
  const [sForm, setSForm] = useState({ name: "", place: "" });
  const [photos, setPhotos] = useState([]);
  const [koushuOpen, setKoushuOpen] = useState(null);
  const [bb, setBb] = useState({ kouji: "", koushu: "外部足場", koutei: "着手前", basho: "" });
  const [cam, setCam] = useState(false);

  const [threads, setThreads] = useState(SEED_THREADS);
  const [invites, setInvites] = useState(SEED_INVITES);
  const [inviteOpen, setInviteOpen] = useState(null);
  const [invitePt, setInvitePt] = useState(1);
  const [viewedInv, setViewedInv] = useState([]);
  const [tasksDone, setTasksDone] = useState([]);
  const [msgJob, setMsgJob] = useState(null);
  const [draft, setDraft] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);
  const [favs, setFavs] = useState([1]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [fArea, setFArea] = useState("すべて");
  const [fGyoshu, setFGyoshu] = useState("すべて");
  const [fKeishiki, setFKeishiki] = useState("すべて");
  const [fJisu, setFJisu] = useState("すべて");
  const [fStatus, setFStatus] = useState("募集中");
  const [onlyFav, setOnlyFav] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [pForm, setPForm] = useState({
    name: "", keishiki: "請負", gyoshu: "足場", area: "", kibo: "", jisu: "1次下請",
    kokiA: "", kokiB: "", boshuA: "", boshuB: "", site: "",
    mode: "指値", shizane: "", kigen: "", tanka: "", ninzu: "",
  });
  const [usedDetail, setUsedDetail] = useState([]);
  const [usedMsg, setUsedMsg] = useState([]);
  const [posted, setPosted] = useState(0);
  const [scoutJob, setScoutJob] = useState(null);
  const [scoutSent, setScoutSent] = useState([]);
  const [companyOpen, setCompanyOpen] = useState(null);
  const [company, setCompany] = useState(null);
  const [cq, setCq] = useState("");
  const [coFavOnly, setCoFavOnly] = useState(false);
  const [coTxOnly, setCoTxOnly] = useState(false);
  const [myJobsOpen, setMyJobsOpen] = useState(false);
  const [myAkiOpen, setMyAkiOpen] = useState(false);
  const [legend, setLegend] = useState(false);
  const [invOpen, setInvOpen] = useState(true);
  const [cqInput, setCqInput] = useState("");
  const [txs, setTxs] = useState(SEED_TX);
  const [txOpen, setTxOpen] = useState(null);
  const [txForm, setTxForm] = useState(null);
  const [oForm, setOForm] = useState({ partner: "", kouji: "", basho: "", gaku: "", tanka: "", keishiki: "請負", kokiA: "", kokiB: "", shiharai: "", note: "", locked: false });
  const [rForm, setRForm] = useState({ date: "", ninzu: "", naiyou: "", note: "" });
  const [iForm, setIForm] = useState({ orderId: null, kind: "全額", gaku: "", due: "", month: "" });
  const [confirm, setConfirm] = useState(null);
  const [docView, setDocView] = useState(null);
  const [favCos, setFavCos] = useState(["彩北総業"]);
  const [appsJob, setAppsJob] = useState(null);
  const [plansOpen, setPlansOpen] = useState(false);
  const [partners, setPartners] = useState(SEED_PARTNERS);
  const [partnerNew, setPartnerNew] = useState(false);
  const [ptForm, setPtForm] = useState({ name: "", tanto: "", shime: "末日", shiharai: "翌月末", renraku: "", invite: true });
  const [qForm, setQForm] = useState({ naiyou: "", gaku: "", kokiA: "", kokiB: "" });
  const [declined, setDeclined] = useState([]);
  const [appSort, setAppSort] = useState("gaku");
  const [bulk, setBulk] = useState([]);
  const [rptComment, setRptComment] = useState({});
  const [payments, setPayments] = useState(SEED_PAYMENTS);
  const [payOpen, setPayOpen] = useState(null);
  const [myDocs, setMyDocs] = useState(["kyoka", "hoken", "ccus"]);
  const [feed, setFeed] = useState("jobs");
  const [akis, setAkis] = useState(SEED_AKI);
  const [akiPost, setAkiPost] = useState(false);
  const [aForm, setAForm] = useState({
    type: "人工の空き", gyoshu: "足場", area: "", from: "", to: "", ninzu: "", tanka: "", note: "",
  });
  const [toast, setToast] = useState("");
  const [unlockMsg, setUnlockMsg] = useState("");

  const say = (m) => { setToast(m); setTimeout(() => setToast(""), 2400); };
  const clearNav = () => {
    setJobOpen(null); setMsgJob(null); setInviteOpen(null); setScoutJob(null);
    setCompany(null); setPayOpen(null); setTxOpen(null); setCompose(null);
    setComposeJob(null); setPostOpen(false); setAkiPost(false);
    setSiteOpen(null); setSiteNew(false); setKoushuOpen(null); setAttachOpen(false);
    setTxForm(null); setDocView(null); setAppsJob(null); setConfirm(null); setPlansOpen(false); setPartnerNew(false);
  };
  const goPlan = () => { clearNav(); setPlansOpen(true); };
  const isFav = (id) => favs.includes(id);
  const isFavCo = (n) => favCos.includes(n);
  const toggleFavCo = (n) => setFavCos((p) => p.includes(n) ? p.filter((x) => x !== n) : [...p, n]);
  const toggleFav = (id) => setFavs((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const stamp = () => new Date().toLocaleString("ja-JP",
    { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const canDetail = (id) => usedDetail.includes(id) || usedDetail.length < L.detail;
  const canMsg = (key) => usedMsg.includes(key) || usedMsg.length < L.send;
  const canPost = posted < L.post;
  const canScout = scoutSent.length < L.scout;
  const rank = RANK[plan];
  const isOpen = (k) => showAll || ["jobs", "msgs", "me"].includes(k)
    || opened.includes(k)
    || (k === "firms" && stance !== "uke");
  const unlockTab = (k, msg) => {
    if (showAll || opened.includes(k)) return;
    setOpened((p) => [...p, k]);
    setUnlockMsg(msg);
    setTimeout(() => setUnlockMsg(""), 5000);
  };
  const R = ROLES[role];
  /* 金額を出してよいか。現場担当には出さない */
  const money = (v) => R.amount ? yen(v) : "－－－";
  const canIssue = R.issue && L.docs;
  const myScore = docPt(myDocs);
  const myLevel = levelOf(myScore);
  const myAki = akis.filter((a) => a.company === "高橋工業");
  const canAki = myAki.length < L.aki;
  const canSite = sites.length < L.site;

  const openJob = (j) => {
    if (!canDetail(j.id)) { say(`${L.name}の案件詳細は月${L.detail}件までです`); goPlan(); return; }
    if (!paid && !usedDetail.includes(j.id)) setUsedDetail((p) => [...p, j.id]);
    setJobOpen(j);
  };
  const jobConv = (j) => ({ key: `j${j.id}`, title: j.name, partner: j.hacchu, jobId: j.id });
  const coConv = (name) => ({ key: `c:${name}`, title: name, partner: name, jobId: null });
  const convOf = (key) => {
    if (key.startsWith("c:")) return coConv(key.slice(2));
    if (key.startsWith("a") && key.includes(":")) {
      const [jp, co] = key.slice(1).split(":");
      const j = jobs.find((x) => String(x.id) === jp);
      return { key, title: j ? j.name : co, partner: co, jobId: j ? j.id : null };
    }
    const j = jobs.find((x) => `j${x.id}` === key);
    return j ? jobConv(j) : coConv(key);
  };

  const openThread = (cv) => {
    if (!canMsg(cv.key)) { say(`${L.name}でやり取りできるのは${lim(L.send)}件までです`); goPlan(); return; }
    if (!usedMsg.includes(cv.key)) setUsedMsg((p) => [...p, cv.key]);
    setThreads((p) => ({ ...p, [cv.key]: (p[cv.key] || []).map((m) => m.me ? m : { ...m, read: true }) }));
    setMsgJob(cv);
  };
  const postMsg = (key, msg) => {
    setThreads((p) => ({ ...p, [key]: [...(p[key] || []), { t: stamp(), read: false, ...msg }] }));
    setTimeout(() => setThreads((p) => ({
      ...p, [key]: (p[key] || []).map((m) => m.me ? { ...m, read: true } : m),
    })), 1600);
  };
  const unread = (key) => (threads[key] || []).filter((m) => !m.me && !m.read).length;
  const estOf = (key) => [...(threads[key] || [])].reverse()
    .find((m) => m.file && m.file.type === "見積書" && m.file.gaku)?.file || null;
  const unreadInv = invites.filter((i) => !i.read).length;

  const seenInv = (id) => viewedInv.includes(id);
  const canViewInv = (id) => seenInv(id) ||
    (L.recv === "pt" ? invitePt > 0 : viewedInv.length < L.recv);
  const openInvite = (inv) => {
    if (!seenInv(inv.id)) {
      if (!canViewInv(inv.id)) { setInviteOpen({ ...inv, blocked: true }); return; }
      if (L.recv === "pt") setInvitePt((n) => n - 1);
      setViewedInv((p) => [...p, inv.id]);
    }
    setInvites((p) => p.map((x) => x.id === inv.id ? { ...x, read: true } : x));
    setInviteOpen({ ...inv, read: true });
    unlockTab("firms", "「会社」タブが使えるようになりました");
  };
  const doTask = (t) => {
    if (tasksDone.includes(t.id)) return;
    setTasksDone((p) => [...p, t.id]);
    setInvitePt((n) => n + t.pt);
    say(`閲覧ポイントを${t.pt}もらいました`);
  };
  const replyInvite = (inv) => {
    const j = jobs.find((x) => x.id === inv.jobId);
    const cv = j ? jobConv(j) : coConv(inv.from);
    if (!canMsg(cv.key)) { say(`${L.name}でやり取りできるのは${lim(L.send)}件までです`); goPlan(); return; }
    setThreads((p) => ({
      ...p,
      [cv.key]: p[cv.key]?.length ? p[cv.key] : [{ me: false, text: inv.text, t: inv.date, read: true }],
    }));
    setInvites((p) => p.map((x) => x.id === inv.id ? { ...x, replied: true } : x));
    setInviteOpen(null);
    openThread(cv);
  };

  /* ── 案件一覧 ── */
  const AREAS = ["すべて", ...Array.from(new Set(jobs.map((j) => j.area.slice(0, 3))))];
  const GYOSHU = ["すべて", ...Array.from(new Set(jobs.map((j) => j.gyoshu)))];

  const Jobs = () => {
    const myJobs = jobs.filter((j) => j.hacchu === "高橋工業");
    const myAki = akis.filter((a) => a.company === "高橋工業");
    const list = jobs.filter((j) => j.hacchu !== "高橋工業").filter((j) =>
      (fArea === "すべて" || j.area.startsWith(fArea)) &&
      (fGyoshu === "すべて" || j.gyoshu === fGyoshu) &&
      (fKeishiki === "すべて" || j.keishiki === fKeishiki) &&
      (fJisu === "すべて" || j.jisu === fJisu) &&
      (fStatus === "すべて" || j.status === fStatus) &&
      (!onlyFav || isFav(j.id)) &&
      (!q || (j.name + j.hacchu + j.area + j.gyoshu).includes(q))
    );
    return (
      <>
        <Header title={feed === "jobs" ? "案件をさがす" : "空き情報"} right={
          <button onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm"
            style={{ background: filterOpen ? C.ki : "rgba(255,255,255,.14)" }}>
            <SlidersHorizontal size={14} color={filterOpen ? C.sumi : "#fff"} />
            <span className="text-[12px] font-bold" style={{ color: filterOpen ? C.sumi : "#fff" }}>絞り込み</span>
          </button>
        } />

        <div className="flex" style={{ background: C.sumi }}>
          {[["jobs", "案件（仕事）"], ["aki", "空き情報（手空き）"]].map(([k, l]) => (
            <button key={k} onClick={() => setFeed(k)} className="flex-1 py-2 text-[13px] font-bold"
              style={{
                color: feed === k ? C.sumi : "rgba(255,255,255,.6)",
                background: feed === k ? C.ki : "transparent",
              }}>{l}</button>
          ))}
        </div>

        {filterOpen && (
          <div className="p-3" style={{ background: C.kami, borderBottom: `1px solid ${C.keisen}` }}>
            <div className="flex gap-2 mb-3">
              <input value={qInput} onChange={(e) => setQInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setQ(qInput)}
                placeholder="案件名・発注者・地名"
                className="flex-1 px-3 py-2 text-[15px] outline-none"
                style={{ background: C.kami, border: `1px solid ${C.keisen}`, borderRadius: 4, color: C.sumi }} />
              <button onClick={() => setQ(qInput)}
                className="px-4 rounded-sm flex items-center gap-1.5 text-[13px] font-extrabold"
                style={{ background: C.sumi, color: "#fff" }}>
                <Search size={15} />検索
              </button>
            </div>
            {q && (
              <button onClick={() => { setQ(""); setQInput(""); }}
                className="flex items-center gap-1 text-[12px] font-bold mb-2" style={{ color: C.aka }}>
                <X size={13} />「{q}」の検索を解除
              </button>
            )}
            <div className="mb-2">
              <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>下請次数</span>
              <Pills options={["すべて", ...JISU]} value={fJisu} onChange={setFJisu} />
            </div>
            <div className="mb-2">
              <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>募集形態</span>
              <Pills options={["すべて", ...KEISHIKI]} value={fKeishiki} onChange={setFKeishiki} />
            </div>
            <div className="mb-2">
              <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>エリア</span>
              <Pills options={AREAS} value={fArea} onChange={setFArea} />
            </div>
            <div className="mb-2">
              <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>工種</span>
              <Pills options={GYOSHU} value={fGyoshu} onChange={setFGyoshu} />
            </div>
            <div className="mb-2">
              <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>募集状況</span>
              <Pills options={["すべて", ...STATUS]} value={fStatus} onChange={setFStatus} />
            </div>
            <button onClick={() => setOnlyFav(!onlyFav)}
              className="flex items-center gap-1.5 text-[12px] font-bold py-1"
              style={{ color: onlyFav ? C.sumi : C.usu }}>
              <Star size={15} style={{ color: onlyFav ? C.ki : C.keisen }} fill={onlyFav ? C.ki : "none"} />
              お気に入りだけ表示（{favs.length}）
            </button>
          </div>
        )}

        <div className="p-3">
          {plan !== "prem" && (
            <div className="flex items-center gap-2 p-2 mb-3 rounded-sm"
              style={{ background: C.kami, border: `1px solid ${C.ki}` }}>
              <span className="text-[11px] font-extrabold px-1.5 py-[2px] rounded-sm"
                style={{ background: C.ki, color: C.sumi }}>{L.name}</span>
              <span className="text-[12px]" style={{ color: C.sumi }}>
                今月あと
                {L.detail !== INF && ` 詳細 ${Math.max(0, L.detail - usedDetail.length)}件・`}
                {" "}やり取り {Math.max(0, L.send - usedMsg.length)}案件・
                スカウト送信 {Math.max(0, L.scout - scoutSent.length)}件
              </span>
            </div>
          )}

          {feed === "aki" ? (
            <>
              <button onClick={() => canAki ? setAkiPost(true)
                : (say(`${L.name}で出せる空き情報は${lim(L.aki)}件までです`), goPlan())}
                className="w-full mb-2 py-2.5 rounded-sm text-[13px] font-extrabold flex items-center justify-center gap-1.5"
                style={{ background: C.kami, color: C.sumi, border: `1px solid ${canAki ? C.sumi : C.keisen}` }}>
                {canAki ? <Plus size={15} /> : <Lock size={14} />}空き情報を投稿する
              </button>
              <p className="text-[11px] mb-3 text-center" style={{ color: C.usu }}>
                掲載中 {myAki.length}／{lim(L.aki)}件
                {!canAki && "・取り下げると新しく出せます"}
              </p>
              {myAki.length > 0 && (
                <>
                  <MineHead label="自社の投稿" n={myAki.length} open={myAkiOpen}
                    onClick={() => setMyAkiOpen(!myAkiOpen)} />
                  {myAkiOpen && myAki.map((a) => (
                    <DenpyoCard key={a.id} tone="midori">
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        <Chip solid color={a.type === "人工の空き" ? C.midori : C.sumi}>{a.type}</Chip>
                        <Chip color={C.sumi}>{a.gyoshu}</Chip>
                      </div>
                      <Row icon={Calendar} label="空き期間" value={range(a.from, a.to)} mono />
                      {a.ninzu > 0 && <Row icon={Users} label="空き人数" value={`${a.ninzu}人`} mono />}
                      {a.type === "人工の空き" && (
                        <Row icon={Banknote} label="希望単価"
                          value={a.tanka ? `${money(a.tanka)}／人工` : "応相談"} mono />
                      )}
                      <p className="text-[13px] mt-1.5" style={{ color: C.sumi }}>{a.note}</p>
                      <div className="mt-2">
                        <button onClick={() => {
                          setAkis((p) => p.filter((x) => x.id !== a.id)); say("空き情報を取り下げました");
                        }} className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: C.aka }}>
                          <Trash2 size={16} />この空き情報を取り下げる
                        </button>
                      </div>
                    </DenpyoCard>
                  ))}
                </>
              )}
              {akis
                .filter((a) => a.company !== "高橋工業")
                .filter((a) => (fArea === "すべて" || a.area.startsWith(fArea)) &&
                  (fGyoshu === "すべて" || a.gyoshu === fGyoshu) &&
                  (!q || (a.company + a.area + a.gyoshu + a.note).includes(q)))
                .map((a) => {
                  const mine = a.company === "高橋工業";
                  const sent = scoutSent.includes(`aki-${a.id}`);
                  return (
                    <DenpyoCard key={a.id} tone={a.type === "人工の空き" ? "midori" : "ki"}>
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        <Chip solid color={a.type === "人工の空き" ? C.midori : C.sumi}>{a.type}</Chip>
                        <Chip color={C.sumi}>{a.gyoshu}</Chip>
                        {mine && <Chip color={C.usu}>自社</Chip>}
                        <span className="flex-1" />
                        <Chip color={C.midori}>{a.level}</Chip>
                      </div>
                      <button onClick={() => setCompany(a.company)}
                        className="flex items-center gap-1 mb-[2px]">
                        <span className="text-[15px] font-extrabold underline" style={{ color: C.sumi }}>
                          {a.company}
                        </span>
                        <ChevronRight size={15} style={{ color: C.usu }} />
                      </button>
                      <div className="text-[12px] mb-1.5" style={{ color: C.usu }}>{a.area}</div>
                      <Row icon={Calendar} label="空き期間" value={range(a.from, a.to)} mono />
                      {a.ninzu > 0 && <Row icon={Users} label="空き人数" value={`${a.ninzu}人`} mono />}
                      {a.type === "人工の空き" && (
                        <Row icon={Banknote} label="希望単価"
                          value={a.tanka ? `${money(a.tanka)}／人工` : "応相談"} mono />
                      )}
                      <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: C.sumi }}>{a.note}</p>
                      <div className="text-[10px] mt-1.5 mb-2" style={{ color: C.usu, fontFamily: MONO }}>
                        投稿 {fmt(a.posted)}
                      </div>
                      {mine ? (
                        <button onClick={() => {
                          setAkis((p) => p.filter((x) => x.id !== a.id)); say("空き情報を取り下げました");
                        }} className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: C.aka }}>
                          <Trash2 size={16} />この空き情報を取り下げる
                        </button>
                      ) : (sent ? (
                        <div className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: C.midori }}>
                          <Check size={16} />スカウト送信済
                        </div>
                      ) : (
                        <Btn tone="ki" disabled={!canScout} onClick={() => {
                          setScoutSent((p) => [...p, `aki-${a.id}`]);
                          if (!tasksDone.includes("hasshin")) doTask(PROFILE_TASKS.find((t) => t.id === "hasshin"));
                          say(`${a.company} にスカウトを送りました`);
                        }}>
                          {canScout ? "この業者にスカウトを送る" : "今月のスカウト送信上限に達しています"}
                        </Btn>
                      ))}
                    </DenpyoCard>
                  );
                })}
            </>
          ) : (
          <>
          <Legend open={legend} onClick={() => setLegend(!legend)} items={feed === "aki"
            ? [[C.midori, "人工の空き（応援に入れます）"], [C.ki, "工事枠の空き（仕事を探しています）"]]
            : [[C.midori, "1次下請"], [C.usu, "2次下請"], [C.aka, "3次下請"],
               [C.ki, "募集中"], [C.keisen, "募集停止・募集終了"]]} />

          <button onClick={() => canPost ? setPostOpen(true) : (say(`${L.name}の案件投稿は月${lim(L.post)}件までです`), goPlan())}
            className="w-full mb-3 py-2.5 rounded-sm text-[13px] font-extrabold flex items-center justify-center gap-1.5"
            style={{ background: C.kami, color: C.sumi, border: `1px solid ${C.sumi}` }}>
            <Plus size={15} />案件を投稿する
          </button>

          {myJobs.length > 0 && (
            <>
              <MineHead label="自社の投稿" n={myJobs.length} open={myJobsOpen}
                onClick={() => setMyJobsOpen(!myJobsOpen)} />
              {myJobsOpen && myJobs.map((j) => (
                <DenpyoCard key={j.id} tone="midori">
                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                    <Chip solid color={statusColor(j.status)}>{j.status}</Chip>
                    <Chip color={C.sumi}>{j.gyoshu}</Chip>
                    <Chip solid color={C.midori}>応募 {(j.applications || []).length}件</Chip>
                  </div>
                  <button onClick={() => openJob(j)} className="block w-full text-left">
                    <div className="text-[15px] font-extrabold mb-[2px]" style={{ color: C.sumi }}>{j.name}</div>
                    <div className="text-[12px] mb-1.5" style={{ color: C.usu }}>{j.area}</div>
                    <Row label="募集期間" value={range(j.boshuA, j.boshuB)} mono />
                    <Row label="投稿日" value={fmt(j.posted)} mono />
                  </button>
                  <div className="mt-2">
                    <Btn tone="ki" onClick={() => setAppsJob(j)}>
                      <span className="inline-flex items-center gap-1.5">
                        <Users size={15} />応募 {(j.applications || []).length}件を見る
                      </span>
                    </Btn>
                  </div>
                </DenpyoCard>
              ))}
            </>
          )}

          {list.length === 0 && (
            <p className="text-[13px] py-10 text-center" style={{ color: C.usu }}>
              条件に合う案件がありません。絞り込みを変えてみてください。
            </p>
          )}

          {list.map((j) => {
            const ouen = j.keishiki === "応援（常用）";
            return (
              <DenpyoCard key={j.id} tone={j.status === "募集中" ? "ki" : "usu"}>
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <Chip solid color={statusColor(j.status)}>{j.status}</Chip>
                  <Chip solid color={jisuColor(j.jisu)}>{j.jisu}</Chip>
                  <Chip solid color={ouen ? C.sumi : C.usu}>{ouen ? "応援" : "請負"}</Chip>
                  <Chip color={C.sumi}>{j.gyoshu}</Chip>
                  {j.pub && <Chip color={C.sumi}>公共事業</Chip>}
                  {j.hacchu === "高橋工業" && <Chip solid color={C.midori}>自社・応募{(j.applications || []).length}件</Chip>}
                  <span className="flex-1" />
                  <button onClick={() => toggleFav(j.id)} className="p-1 -mr-1" aria-label="お気に入り">
                    <Star size={19} style={{ color: isFav(j.id) ? C.ki : C.keisen }}
                      fill={isFav(j.id) ? C.ki : "none"} strokeWidth={2.2} />
                  </button>
                </div>
                <button onClick={() => openJob(j)} className="block w-full text-left">
                  <div className="text-[15px] font-extrabold mb-[2px]" style={{ color: C.sumi }}>{j.name}</div>
                  <div className="text-[12px] mb-1.5" style={{ color: C.usu }}>{j.hacchu}・{j.area}</div>
                  {ouen
                    ? <>
                        <Row icon={Users} label="必要人数" value={`${j.ninzu}人／日`} mono />
                        <Row label="期間" value={range(j.kokiA, j.kokiB)} mono />
                        <Row icon={Banknote} label="人工単価" value={`${money(j.tanka)}／人工`} mono />
                      </>
                    : <>
                        <Row label="規模" value={j.kibo} mono />
                        <Row label="工期" value={range(j.kokiA, j.kokiB)} mono />
                        {j.mode === "見積依頼"
                          ? <Row label="価格" value={`見積依頼（提出期限 ${fmt(j.kigen)}）`} />
                          : paid ? <Row label="指値" value={money(j.shizane)} mono />
                                 : <Locked label="指値" onOpen={goPlan} />}
                      </>}
                  <Row label="募集期間" value={range(j.boshuA, j.boshuB)} mono />
                  <Row label="支払" value={j.saito} />
                  <div className="text-[10px] mt-1.5" style={{ color: C.usu, fontFamily: MONO }}>
                    投稿 {fmt(j.posted)}
                  </div>
                </button>
              </DenpyoCard>
            );
          })}
          </>
          )}
        </div>
      </>
    );
  };

  /* ── 空き情報の投稿 ── */
  const AkiPost = () => (
    <>
      <Header title="空き情報を投稿する" back={() => setAkiPost(false)} />
      <div className="p-3">
        <div className="p-2 mb-3 rounded-sm" style={{ background: C.kami, border: `1px solid ${C.keisen}` }}>
          <p className="text-[12px]" style={{ color: C.usu }}>
            手が空いている期間を出しておくと、元請から声が掛かります。投稿は無制限です。
          </p>
        </div>
        <div className="mb-3">
          <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>種別</span>
          <Radio options={AKI_TYPES} value={aForm.type} onChange={(v) => setAForm({ ...aForm, type: v })} />
        </div>
        <div className="mb-3">
          <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>工種</span>
          <Pills options={["足場", "塗装", "解体", "内装", "土木", "建築"]}
            value={aForm.gyoshu} onChange={(v) => setAForm({ ...aForm, gyoshu: v })} />
        </div>
        <Field label="対応エリア" value={aForm.area} onChange={(v) => setAForm({ ...aForm, area: v })}
          placeholder="千葉県市原市" />
        <DateRange label="空き期間" a={aForm.from} b={aForm.to}
          onA={(v) => setAForm({ ...aForm, from: v })} onB={(v) => setAForm({ ...aForm, to: v })} />
        {aForm.type === "人工の空き" && (
          <>
            <Field label="空き人数" type="number" value={aForm.ninzu}
              onChange={(v) => setAForm({ ...aForm, ninzu: v })} placeholder="3" />
            <Field label="希望人工単価（税抜・1人工あたり）" type="number" value={aForm.tanka}
              onChange={(v) => setAForm({ ...aForm, tanka: v })} placeholder="23000"
              hint="空欄なら「応相談」と表示されます" />
          </>
        )}
        <Field label="ひとこと" value={aForm.note} onChange={(v) => setAForm({ ...aForm, note: v })}
          placeholder="3名空いています。近隣なら即日対応できます。" />
        <Btn tone="ki" disabled={!aForm.area || !aForm.from}
          onClick={() => {
            setAkis((p) => [{
              id: Date.now(), company: "高橋工業", level: "Silver",
              ...aForm, ninzu: Number(aForm.ninzu) || 0, tanka: Number(aForm.tanka) || 0,
              posted: new Date().toISOString().slice(0, 10),
            }, ...p]);
            setAForm({ type: "人工の空き", gyoshu: "足場", area: "", from: "", to: "", ninzu: "", tanka: "", note: "" });
            setAkiPost(false); setFeed("aki"); say("空き情報を投稿しました");
          }}>投稿する</Btn>
      </div>
    </>
  );

  /* ── 案件投稿 ── */
  const PostJob = () => {
    const ouen = pForm.keishiki === "応援（常用）";
    return (
      <>
        <Header title="案件を投稿する" back={() => setPostOpen(false)} />
        <div className="p-3">
          <div className="mb-3">
            <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>募集形態</span>
            <Radio options={KEISHIKI} value={pForm.keishiki}
              onChange={(v) => setPForm({ ...pForm, keishiki: v })} />
          </div>
          <Field label="案件名" value={pForm.name} onChange={(v) => setPForm({ ...pForm, name: v })}
            placeholder={ouen ? "船橋 現場応援（足場 常用）" : "五井中央 共同住宅 外部足場"} />
          <div className="mb-3">
            <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>工種</span>
            <Pills options={["足場", "塗装", "解体", "内装", "土木", "建築"]}
              value={pForm.gyoshu} onChange={(v) => setPForm({ ...pForm, gyoshu: v })} />
          </div>
          <div className="mb-3">
            <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
              受注する側の下請次数
            </span>
            <Radio options={JISU} value={pForm.jisu} onChange={(v) => setPForm({ ...pForm, jisu: v })} />
            <span className="block text-[11px] mt-1" style={{ color: C.usu }}>
              単価に直結する情報です。正直に出すほど応募が集まります
            </span>
          </div>
          <Field label="エリア" value={pForm.area} onChange={(v) => setPForm({ ...pForm, area: v })}
            placeholder="千葉県市原市" />
          <Field label="現場住所" value={pForm.site} onChange={(v) => setPForm({ ...pForm, site: v })}
            placeholder="市原市五井中央西2-1-8" />

          {ouen ? (
            <>
              <Field label="必要人数（人／日）" type="number" value={pForm.ninzu}
                onChange={(v) => setPForm({ ...pForm, ninzu: v })} placeholder="3" />
              <Field label="人工単価（税抜）" type="number" value={pForm.tanka}
                onChange={(v) => setPForm({ ...pForm, tanka: v })} placeholder="22000"
                hint="常用の1人工あたりの単価です" />
              <DateRange label="応援期間" a={pForm.kokiA} b={pForm.kokiB}
                onA={(v) => setPForm({ ...pForm, kokiA: v })} onB={(v) => setPForm({ ...pForm, kokiB: v })} />
            </>
          ) : (
            <>
              <Field label="規模" value={pForm.kibo} onChange={(v) => setPForm({ ...pForm, kibo: v })}
                placeholder="1,240㎡" />
              <DateRange label="工期" a={pForm.kokiA} b={pForm.kokiB}
                onA={(v) => setPForm({ ...pForm, kokiA: v })} onB={(v) => setPForm({ ...pForm, kokiB: v })} />
              <div className="mb-3">
                <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>価格の出し方</span>
                <Radio options={["指値", "見積依頼"]} value={pForm.mode}
                  onChange={(v) => setPForm({ ...pForm, mode: v })} />
              </div>
              {pForm.mode === "指値"
                ? <Field label="指値（税抜）" type="number" value={pForm.shizane}
                    onChange={(v) => setPForm({ ...pForm, shizane: v })} placeholder="1860000" />
                : <label className="block mb-3">
                    <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
                      見積提出期限
                    </span>
                    <input type="date" value={pForm.kigen}
                      onChange={(e) => setPForm({ ...pForm, kigen: e.target.value })}
                      className="w-full px-3 py-2 text-[15px] outline-none"
                      style={{ background: C.kami, border: `1px solid ${C.keisen}`, borderRadius: 4, color: C.sumi }} />
                  </label>}
            </>
          )}

          <DateRange label="募集期間" a={pForm.boshuA} b={pForm.boshuB}
            onA={(v) => setPForm({ ...pForm, boshuA: v })} onB={(v) => setPForm({ ...pForm, boshuB: v })} />

          <Btn tone="ki" disabled={!pForm.name || !pForm.area}
            onClick={() => {
              setJobs((p) => [{
                id: Date.now(), ...pForm,
                shizane: Number(pForm.shizane) || 0, tanka: Number(pForm.tanka) || 0,
                ninzu: Number(pForm.ninzu) || 0,
                saito: "翌月末", pub: false, hacchu: "高橋工業", level: "Silver",
                status: "募集中", posted: new Date().toISOString().slice(0, 10),
              }, ...p]);
              if (!paid) setPosted((n) => n + 1);
              setPForm({
                name: "", keishiki: "請負", gyoshu: "足場", area: "", kibo: "", jisu: "1次下請",
                kokiA: "", kokiB: "", boshuA: "", boshuB: "", site: "",
                mode: "指値", shizane: "", kigen: "", tanka: "", ninzu: "",
              });
              setPostOpen(false); say("案件を投稿しました");
            unlockTab("firms", "「会社」タブが使えるようになりました");
            }}>投稿する</Btn>
        </div>
      </>
    );
  };

  /* ── 案件詳細 ── */
  const JobDetail = ({ j }) => {
    const ouen = j.keishiki === "応援（常用）";
    return (
      <>
        <Header title={j.name} back={() => setJobOpen(null)} right={
          <button onClick={() => toggleFav(j.id)} className="p-1" aria-label="お気に入り">
            <Star size={21} style={{ color: isFav(j.id) ? C.ki : "rgba(255,255,255,.5)" }}
              fill={isFav(j.id) ? C.ki : "none"} strokeWidth={2.2} />
          </button>
        } />
        <div className="p-3">
          <DenpyoCard tone={j.status === "募集中" ? (j.pub ? "ki" : "plain") : "usu"}>
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              <Chip solid color={statusColor(j.status)}>{j.status}</Chip>
              <Chip solid color={jisuColor(j.jisu)}>{j.jisu}</Chip>
              <Chip solid color={ouen ? C.sumi : C.usu}>{j.keishiki}</Chip>
              <Chip color={C.sumi}>{j.gyoshu}</Chip>
              {j.pub && <Chip color={C.sumi}>公共事業</Chip>}
            </div>
            <button onClick={() => setCompany(j.hacchu)} className="flex items-center gap-2 w-full text-left py-[3px]">
              <Building2 size={13} style={{ color: C.usu, flexShrink: 0 }} />
              <span className="text-[12px] w-16 flex-shrink-0" style={{ color: C.usu }}>発注者</span>
              <span className="text-[13px] font-bold underline" style={{ color: C.sumi }}>{j.hacchu}</span>
              <ChevronRight size={15} style={{ color: C.usu }} />
            </button>
            <Row icon={ShieldCheck} label="信用" value={j.level} />
            <Row icon={Briefcase} label="下請次数" value={j.jisu} />
            <Row icon={MapPin} label="エリア" value={j.area} />
            {ouen ? (
              <>
                <Row icon={Users} label="必要人数" value={`${j.ninzu}人／日`} mono />
                <Row icon={Calendar} label="応援期間" value={range(j.kokiA, j.kokiB)} mono />
              </>
            ) : (
              <>
                <Row label="規模" value={j.kibo} mono />
                <Row icon={Calendar} label="工期" value={range(j.kokiA, j.kokiB)} mono />
              </>
            )}
            <Row icon={Calendar} label="募集期間" value={range(j.boshuA, j.boshuB)} mono />
            <Row label="投稿日" value={fmt(j.posted)} mono />
            <Row icon={Banknote} label="支払" value={j.saito} />
            <div className="my-2" style={{ borderTop: `1px dashed ${C.keisen}` }} />
            {j.mode === "見積依頼" && !ouen && (
              <Row icon={Calendar} label="提出期限" value={fmt(j.kigen)} mono />
            )}
            {ouen && <Row icon={Banknote} label="人工単価" value={`${money(j.tanka)}／人工`} mono />}
            {paid ? (
              <>
                <Row icon={MapPin} label="現場住所" value={j.site} />
                {!ouen && <Row icon={Banknote} label="価格"
                  value={j.mode === "指値" ? money(j.shizane) : "見積依頼"} mono />}
              </>
            ) : (
              <>
                <Locked label="現場住所" onOpen={goPlan} />
                {!ouen && <Locked label="指値" onOpen={goPlan} />}
              </>
            )}
            <Row icon={FileText} label="資料" value="メッセージで受け取ります" />
          </DenpyoCard>

          {j.status !== "募集中" ? (
            <p className="text-[13px] py-3 text-center" style={{ color: C.usu }}>
              この案件は{j.status}です。
            </p>
          ) : (
            j.hacchu === "高橋工業" ? (
              <>
                <Btn tone="ki" onClick={() => { setJobOpen(null); setAppsJob(j); }}>
                  <span className="inline-flex items-center gap-1.5">
                    <Users size={16} />応募 {(j.applications || []).length}件を見る
                  </span>
                </Btn>
                <div className="mt-2">
                  <Btn onClick={() => { setJobOpen(null); setScoutJob(j); }}>
                    協力業者にスカウトを送る
                  </Btn>
                </div>
              </>
            ) : (
            <>
              <Btn tone="ki" onClick={() => { say("応募しました。やり取りはメッセージに入ります"); setJobOpen(null); }}>
                {j.mode === "見積依頼" && !ouen ? "見積を出して応募する" : "この条件で応募する"}
              </Btn>
              <div className="mt-2">
                <button onClick={() => openThread(jobConv(j))}
                  className="w-full py-3 text-[15px] font-extrabold rounded-sm flex items-center justify-center gap-2"
                  style={{ background: C.kami, color: C.sumi, border: `1px solid ${C.sumi}` }}>
                  <MessageSquare size={16} />メッセージ
                  {unread(`j${j.id}`) > 0 && (
                    <span className="text-[11px] px-1.5 py-[1px] rounded-full"
                      style={{ background: C.aka, color: "#fff" }}>{unread(`j${j.id}`)}</span>
                  )}
                </button>
              </div>
            </>
            )
          )}
        </div>
      </>
    );
  };

  /* ── 会社情報（プランで見える範囲が変わる） ── */
  const CompanyView = ({ name }) => {
    const c = COMPANIES[name];
    if (!c) return (
      <>
        <Header title={name} back={() => setCompany(null)} />
        <div className="p-3"><p className="text-[13px]" style={{ color: C.usu }}>情報がありません。</p></div>
      </>
    );
    const score = docPt(c.docs) + Math.min(20, c.torihiki);
    const lv = levelOf(score);
    return (
      <>
        <Header title={name} back={() => setCompany(null)} right={
          <button onClick={() => toggleFavCo(name)} className="p-1" aria-label="お気に入り">
            <Star size={21} style={{ color: isFavCo(name) ? C.ki : "rgba(255,255,255,.5)" }}
              fill={isFavCo(name) ? C.ki : "none"} strokeWidth={2.2} />
          </button>
        } />
        <div className="p-3">
          <DenpyoCard tone="ki">
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              <Chip solid color={C.midori}>信用 {lv}</Chip>
              <Chip color={C.sumi}>{c.gyoshu}</Chip>
              <span className="flex-1" />
              <span className="text-[12px] font-extrabold" style={{ color: C.usu, fontFamily: MONO }}>
                {score}点
              </span>
            </div>
            <div className="text-[17px] font-extrabold mb-2" style={{ color: C.sumi }}>{name}</div>
            <Row icon={Building2} label="代表者" value={c.rep} />
            <Row label="設立" value={c.est} mono />
            <Row icon={MapPin} label="所在地" value={c.area} />
            <Row icon={ShieldCheck} label="建設業許可" value={c.kyoka} mono />
            {c.url && (
              <div className="mt-2 pt-2" style={{ borderTop: `1px dashed ${C.keisen}` }}>
                <Gate ok={rank >= 2} need="プロ">
                  <a href={c.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-[13px] font-bold underline"
                    style={{ color: C.sumi }}>
                    <Globe size={15} style={{ color: C.usu }} />
                    ホームページ・SNSを見る
                    <ChevronRight size={15} style={{ color: C.usu }} />
                  </a>
                </Gate>
              </div>
            )}
          </DenpyoCard>

          <h2 className="text-[13px] font-extrabold mb-2" style={{ color: C.sumi }}>提出されている書類</h2>
          <DenpyoCard>
            {TRUST_DOCS.map((d) => {
              const has = c.docs.includes(d.id);
              return (
                <div key={d.id} className="flex items-center gap-2 py-[5px]">
                  {has ? <Check size={15} style={{ color: C.midori, flexShrink: 0 }} />
                       : <X size={15} style={{ color: C.keisen, flexShrink: 0 }} />}
                  <span className="flex-1 text-[12px]" style={{ color: has ? C.sumi : C.usu }}>{d.label}</span>
                  <span className="text-[11px] font-bold"
                    style={{ color: has ? C.midori : C.keisen, fontFamily: MONO }}>+{d.pt}</span>
                </div>
              );
            })}
          </DenpyoCard>

          <h2 className="text-[13px] font-extrabold mb-2" style={{ color: C.sumi }}>
            取引実績{rank >= 2 && "（詳細）"}
          </h2>
          <DenpyoCard tone={rank >= 1 ? "plain" : "usu"}>
            <Gate ok={rank >= 1 && R.amount} need="スタンダード">
              <div className="flex gap-2">
                {(rank >= 2
                  ? [["発注数", c.hacchu], ["受注数", c.jusyu], ["取引社数", c.torihiki]]
                  : [["発注数", c.hacchu], ["受注数", c.jusyu]]).map(([l, v]) => (
                  <div key={l} className="flex-1 py-2 text-center rounded-sm" style={{ background: C.yojo }}>
                    <div className="text-[20px] font-extrabold" style={{ color: C.sumi, fontFamily: MONO }}>{v}</div>
                    <div className="text-[10px]" style={{ color: C.usu }}>{l}</div>
                  </div>
                ))}
              </div>
            </Gate>
          </DenpyoCard>

          <h2 className="text-[13px] font-extrabold mb-2" style={{ color: C.sumi }}>運営による評価</h2>
          <DenpyoCard tone={rank >= 2 ? "plain" : "usu"}>
            <Gate ok={rank >= 2} need="プロ">
              <Stars n={c.stars} />
              <p className="text-[11px] mt-2" style={{ color: C.usu }}>
                企業情報の充実度と取引の実績をもとに、運営が付けた評価です。
              </p>
            </Gate>
          </DenpyoCard>

          <h2 className="text-[13px] font-extrabold mb-2" style={{ color: C.sumi }}>支払いの実績</h2>
          <DenpyoCard tone={rank >= 3 ? "plain" : "usu"}>
            <Gate ok={rank >= 3} need="プレミアム">
              <div className="flex gap-2 mb-2">
                <div className="flex-1 py-2 text-center rounded-sm" style={{ background: C.yojo }}>
                  <div className="text-[20px] font-extrabold" style={{ color: C.midori, fontFamily: MONO }}>
                    {c.ontime}
                  </div>
                  <div className="text-[10px]" style={{ color: C.usu }}>期日内の支払</div>
                </div>
                <div className="flex-1 py-2 text-center rounded-sm" style={{ background: C.yojo }}>
                  <div className="text-[20px] font-extrabold"
                    style={{ color: c.delay > 0 ? C.aka : C.sumi, fontFamily: MONO }}>{c.delay}</div>
                  <div className="text-[10px]" style={{ color: C.usu }}>遅延</div>
                </div>
              </div>
              <p className="text-[11px]" style={{ color: C.usu }}>
                アプリ内の請求と入金の記録から集計しています。遅延として載るのは、
                相手への確認と運営の事実確認を経て確定したものだけです。
                確認中・異議申立中のものは含みません。
              </p>
            </Gate>
          </DenpyoCard>

          <div className="mb-3">
            <Btn tone="ki" onClick={() => { clearNav(); setTab("msgs"); openThread(coConv(name)); }}>
              この会社にメッセージを送る
            </Btn>
            <p className="text-[11px] mt-2 text-center" style={{ color: C.usu }}>
              やり取りの中から取引を依頼できます（{L.name}は{lim(L.send)}件まで）
            </p>
          </div>

          {rank < 3 && (
            <div className="p-3 rounded-sm" style={{ background: C.ki }}>
              <p className="text-[13px] font-extrabold mb-1" style={{ color: C.sumi }}>
                もっと詳しく見るには
              </p>
              <p className="text-[12px] mb-3" style={{ color: C.sumi }}>
                スタンダードで取引実績、プロで運営評価、プレミアムで支払いの遅延まで確認できます。
              </p>
              <Btn onClick={goPlan}>プランを見る</Btn>
            </div>
          )}
        </div>
      </>
    );
  };

  /* ── スカウトを送る ── */
  const ScoutList = ({ j }) => (
    <>
      <Header title="スカウトを送る" back={() => setScoutJob(null)} right={
        <span className="text-[12px] font-bold" style={{ color: C.ki, fontFamily: MONO }}>
          残り {L.scout === INF ? "∞" : Math.max(0, L.scout - scoutSent.length)}
        </span>
      } />
      <div className="px-3 py-2" style={{ background: C.kami, borderBottom: `1px solid ${C.keisen}` }}>
        <div className="text-[11px] font-bold" style={{ color: C.usu }}>この案件で声を掛けます</div>
        <div className="text-[13px] font-extrabold" style={{ color: C.sumi }}>{j.name}</div>
      </div>
      <div className="p-3">
        {L.scout === 0 ? (
          <div className="p-3 rounded-sm" style={{ background: C.ki }}>
            <p className="text-[13px] font-extrabold mb-1" style={{ color: C.sumi }}>
              スカウトの送信は有料プランの機能です
            </p>
            <p className="text-[12px] mb-3" style={{ color: C.sumi }}>
              スタンダードで月10件、プロで20件、プレミアムで50件まで送れます。
            </p>
            <Btn onClick={goPlan}>プランを見る</Btn>
          </div>
        ) : (
          <>
          <div className="p-2 mb-3 rounded-sm" style={{ background: C.kami, border: `1px solid ${C.keisen}` }}>
            <p className="text-[12px] mb-2" style={{ color: C.usu }}>
              相見積もりを取るときは、まとめて選んで一度に送れます。
            </p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {SEED_GYOSHA.filter((g) => g.gyoshu === j.gyoshu).map((g) => {
                const on = bulk.includes(g.id);
                const sent = scoutSent.includes(`${j.id}-${g.id}`);
                return (
                  <button key={g.id} disabled={sent}
                    onClick={() => setBulk((p) => p.includes(g.id) ? p.filter((x) => x !== g.id) : [...p, g.id])}
                    className="text-[12px] px-2.5 py-1 rounded-sm font-bold disabled:opacity-40"
                    style={{ background: on ? C.sumi : C.kami, color: on ? "#fff" : C.usu,
                      border: `1px solid ${on ? C.sumi : C.keisen}` }}>
                    {sent ? `${g.name}（送信済）` : g.name}
                  </button>
                );
              })}
            </div>
            <Btn tone="ki" disabled={bulk.length === 0 || scoutSent.length + bulk.length > L.scout}
              onClick={() => setConfirm({
                title: `${bulk.length}社にまとめて見積依頼を送りますか`,
                note: `今月のスカウト枠を${bulk.length}件使います（残り${Math.max(0, L.scout - scoutSent.length)}件）`,
                rows: bulk.map((id) => ["宛先", SEED_GYOSHA.find((g) => g.id === id).name]),
                okLabel: `${bulk.length}社に送る`,
                onOk: () => {
                  setScoutSent((p) => [...p, ...bulk.map((id) => `${j.id}-${id}`)]);
                  if (!tasksDone.includes("hasshin")) doTask(PROFILE_TASKS.find((t) => t.id === "hasshin"));
                  say(`${bulk.length}社に見積依頼を送りました`);
                  setBulk([]); setConfirm(null);
                },
              })}>
              {bulk.length === 0 ? "送る相手を選んでください"
                : scoutSent.length + bulk.length > L.scout ? "今月の送信枠を超えます"
                : `選んだ${bulk.length}社にまとめて送る`}
            </Btn>
          </div>

          {SEED_GYOSHA.filter((g) => g.gyoshu === j.gyoshu || j.gyoshu === "").map((g) => {
            const sent = scoutSent.includes(`${j.id}-${g.id}`);
            return (
              <DenpyoCard key={g.id} tone={sent ? "midori" : "plain"}>
                <div className="flex items-center gap-1.5 mb-1">
                  <button onClick={() => setCompany(g.name)} className="flex items-center gap-1">
                    <span className="text-[15px] font-extrabold underline" style={{ color: C.sumi }}>{g.name}</span>
                    <ChevronRight size={15} style={{ color: C.usu }} />
                  </button>
                  <span className="flex-1" />
                  <Chip color={C.midori}>{g.level}</Chip>
                </div>
                <Row label="工種" value={g.gyoshu} />
                <Row label="エリア" value={g.area} />
                <Row label="体制" value={g.jinin} />
                <div className="mt-2">
                  {sent ? (
                    <div className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: C.midori }}>
                      <Check size={16} />スカウト送信済
                    </div>
                  ) : (
                    <Btn tone="ki" disabled={!canScout} onClick={() => {
                      setScoutSent((p) => [...p, `${j.id}-${g.id}`]);
                      if (!tasksDone.includes("hasshin")) doTask(PROFILE_TASKS.find((t) => t.id === "hasshin"));
                      say(`${g.name} にスカウトを送りました`);
                    }}>
                      {canScout ? "スカウトを送る" : "今月の送信上限に達しています"}
                    </Btn>
                  )}
                </div>
              </DenpyoCard>
            );
          })}
          </>
        )}
      </div>
    </>
  );

  /* ── スカウト・見積依頼の詳細 ── */
  const InviteView = ({ inv }) => {
    const j = jobs.find((x) => x.id === inv.jobId);
    const cvv = j ? jobConv(j) : coConv(inv.from);
    const ok = canMsg(cvv.key);
    if (inv.blocked) {
      return (
        <>
          <Header title={inv.type} back={() => setInviteOpen(null)} />
          <div className="p-3">
            <DenpyoCard tone="usu">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Chip solid color={C.usu}>{inv.type}</Chip>
                <span className="flex-1" />
                <span className="text-[11px]" style={{ color: C.usu, fontFamily: MONO }}>{inv.date}</span>
              </div>
              <div className="text-[16px] font-extrabold mb-2" style={{ color: C.sumi }}>{inv.from}</div>
              <div className="flex items-center gap-2 py-4">
                <Lock size={17} style={{ color: C.usu }} />
                <span className="text-[13px]" style={{ color: C.usu }}>本文は閲覧ポイントが必要です</span>
              </div>
            </DenpyoCard>
            <div className="p-3 rounded-sm mb-3" style={{ background: C.ki }}>
              <p className="text-[13px] font-extrabold mb-1" style={{ color: C.sumi }}>
                {L.recv === "pt" ? "閲覧ポイントが残っていません" : "今月の閲覧上限に達しました"}
              </p>
              <p className="text-[12px] mb-3" style={{ color: C.sumi }}>
                {L.recv === "pt"
                  ? "自社プロフィールを充実させるとポイントがもらえます。上位プランなら届いたぶんを読めます。"
                  : "上限に達しました。"}
              </p>
              <Btn onClick={() => { clearNav(); if (L.recv === "pt") setTab("me"); else setPlansOpen(true); }}>
                {L.recv === "pt" ? "プロフィールを充実させる" : "プランを見る"}
              </Btn>
            </div>
          </div>
        </>
      );
    }
    return (
      <>
        <Header title={inv.type} back={() => setInviteOpen(null)} />
        <div className="p-3">
          <DenpyoCard tone={inv.type === "見積依頼" ? "midori" : "ki"}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Chip solid color={inv.type === "見積依頼" ? C.midori : C.sumi}>{inv.type}</Chip>
              {inv.aiteFree && <Chip color={C.usu}>無料プランのユーザーです</Chip>}
              <span className="flex-1" />
              <span className="text-[11px]" style={{ color: C.usu, fontFamily: MONO }}>{inv.date}</span>
            </div>
            <button onClick={() => { setInviteOpen(null); setCompany(inv.from); }}
              className="flex items-center gap-1 mb-2">
              <span className="text-[16px] font-extrabold underline" style={{ color: C.sumi }}>{inv.from}</span>
              <ChevronRight size={16} style={{ color: C.usu }} />
            </button>
            <p className="text-[14px] leading-relaxed" style={{ color: C.sumi }}>{inv.text}</p>
            {inv.aiteFree && (
              <p className="text-[11px] mt-2 pt-2" style={{ color: C.usu, borderTop: `1px dashed ${C.keisen}` }}>
                このユーザーは無料プランのため、返信が届かない場合があります。
              </p>
            )}
          </DenpyoCard>

          {j && (
            <button onClick={() => { setInviteOpen(null); openJob(j); }} className="block w-full text-left">
              <DenpyoCard>
                <div className="text-[11px] font-bold mb-1" style={{ color: C.usu }}>対象の案件</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-extrabold truncate" style={{ color: C.sumi }}>{j.name}</div>
                    <div className="text-[11px]" style={{ color: C.usu }}>
                      {j.keishiki}・{j.area}・{range(j.kokiA, j.kokiB)}
                    </div>
                  </div>
                  <ChevronRight size={17} style={{ color: C.usu }} />
                </div>
              </DenpyoCard>
            </button>
          )}

          {ok ? (
            <>
              <Btn tone="ki" onClick={() => replyInvite(inv)}>返信してやり取りを始める</Btn>
              <p className="text-[11px] mt-2 text-center" style={{ color: C.usu }}>
                返信するとやり取り枠を1案件ぶん使います（読むだけなら消費しません）
              </p>
            </>
          ) : (
            <div className="p-3 rounded-sm" style={{ background: C.ki }}>
              <p className="text-[13px] font-extrabold mb-1" style={{ color: C.sumi }}>
                今月のやり取り上限に達しています
              </p>
              <p className="text-[12px] mb-3" style={{ color: C.sumi }}>
                {L.name}でやり取りできるのは{lim(L.send)}案件までで、今月分はすでに使っています。
                {!paid && "相手の画面にも「無料プランのユーザーです」と表示されます。"}
              </p>
              <Btn onClick={goPlan}>プランを見る</Btn>
            </div>
          )}
        </div>
      </>
    );
  };

  /* ── 自社案件への応募一覧 ── */
  const appConv = (j, co) => ({ key: `a${j.id}:${co}`, title: j.name, partner: co, jobId: j.id });
  const Applications = ({ j }) => {
    const apps = (j.applications || []).filter((a) => !declined.includes(`${j.id}-${a.company}`));
    const gone = (j.applications || []).filter((a) => declined.includes(`${j.id}-${a.company}`));
    const past = (co) => txs.filter((x) => x.partner === co).length;
    const scoreOf = (co) => {
      const c = COMPANIES[co];
      return c ? docPt(c.docs) + Math.min(20, c.torihiki) : 0;
    };
    const sorted = [...apps].sort((a, b) =>
      appSort === "gaku" ? a.gaku - b.gaku
      : appSort === "score" ? scoreOf(b.company) - scoreOf(a.company)
      : past(b.company) - past(a.company));
    return (
      <>
        <Header title="応募一覧" back={() => setAppsJob(null)} right={
          <span className="text-[12px] font-bold" style={{ color: C.ki, fontFamily: MONO }}>
            {apps.length}件
          </span>
        } />
        <div className="px-3 py-2" style={{ background: C.kami, borderBottom: `1px solid ${C.keisen}` }}>
          <div className="text-[13px] font-extrabold" style={{ color: C.sumi }}>{j.name}</div>
          <div className="text-[11px]" style={{ color: C.usu }}>
            {j.mode === "見積依頼" ? `見積依頼・提出期限 ${fmt(j.kigen)}` : `指値 ${money(j.shizane)}`}
          </div>
        </div>

        {/* 比較表 */}
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-[13px] font-extrabold" style={{ color: C.sumi }}>比べる</h2>
            <span className="flex-1" />
            <Pills options={["金額順", "信用順", "取引実績順"]}
              value={appSort === "gaku" ? "金額順" : appSort === "score" ? "信用順" : "取引実績順"}
              onChange={(v) => setAppSort(v === "金額順" ? "gaku" : v === "信用順" ? "score" : "past")} />
          </div>
          <div className="mb-4 rounded-sm overflow-hidden" style={{ border: `1px solid ${C.keisen}` }}>
            <div className="flex px-2 py-1.5 text-[10px] font-bold" style={{ background: C.sumi, color: C.ki }}>
              <span className="flex-1">会社</span>
              <span className="w-20 text-right">見積金額</span>
              <span className="w-12 text-center">信用</span>
              <span className="w-12 text-center">取引</span>
            </div>
            {sorted.map((a, i) => (
              <button key={a.id} onClick={() => setCompany(a.company)}
                className="flex items-center px-2 py-2 w-full text-left"
                style={{ background: C.kami, borderTop: i > 0 ? `1px solid ${C.keisen}` : "none" }}>
                <span className="flex-1 text-[13px] font-bold truncate" style={{ color: C.sumi }}>
                  {a.company}
                </span>
                <span className="w-20 text-right text-[13px] font-extrabold"
                  style={{ color: C.sumi, fontFamily: MONO }}>{money(a.gaku)}</span>
                <span className="w-12 text-center text-[11px] font-bold"
                  style={{ color: C.midori, fontFamily: MONO }}>{levelOf(scoreOf(a.company)).slice(0, 4)}</span>
                <span className="w-12 text-center text-[12px] font-bold"
                  style={{ color: past(a.company) > 0 ? C.sumi : C.keisen, fontFamily: MONO }}>
                  {past(a.company) > 0 ? `${past(a.company)}回` : "初"}
                </span>
              </button>
            ))}
          </div>

          {sorted.map((a) => {
            const cv = appConv(j, a.company);
            const talking = !!threads[cv.key];
            const tx = txs.find((x) => x.convKey === cv.key);
            return (
              <DenpyoCard key={a.id} tone={tx ? TONE.done : TONE.active}>
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <Chip solid color={C.midori}>{levelOf(scoreOf(a.company))}</Chip>
                  {past(a.company) > 0 && <Chip color={C.sumi}>取引{past(a.company)}回</Chip>}
                  {talking && <Chip color={C.usu}>やり取り中</Chip>}
                  {tx && <Chip color={C.midori}>取引あり</Chip>}
                  <span className="flex-1" />
                  <span className="text-[10px]" style={{ color: C.usu, fontFamily: MONO }}>{a.t}</span>
                </div>
                <button onClick={() => setCompany(a.company)} className="flex items-center gap-1 mb-1">
                  <span className="text-[15px] font-extrabold underline" style={{ color: C.sumi }}>{a.company}</span>
                  <ChevronRight size={15} style={{ color: C.usu }} />
                </button>
                <Row icon={Banknote} label="見積金額" value={money(a.gaku)} mono />
                <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: C.sumi }}>{a.msg}</p>
                <div className="mt-3 grid gap-2">
                  <Btn tone="ki" onClick={() => {
                    if (!threads[cv.key]) {
                      setThreads((p) => ({ ...p, [cv.key]: [
                        { me: false, text: a.msg, t: a.t, read: true },
                        { me: false, file: { name: `見積書_${j.name}.pdf`, type: "見積書", gaku: a.gaku },
                          t: a.t, read: true },
                      ] }));
                    }
                    setAppsJob(null); clearNav(); setTab("msgs"); openThread(cv);
                  }}>{talking ? "やり取りを開く" : "やり取りを始める"}</Btn>
                  {tx && (
                    <Btn onClick={() => { setAppsJob(null); clearNav(); setTab("docs"); setDocTab("tx"); setTxOpen(tx); }}>
                      取引を開く（{tx.status}）
                    </Btn>
                  )}
                  {!tx && (
                    <Btn tone="sumi" onClick={() => setConfirm({
                      title: "この応募を見送りますか",
                      note: "相手に「今回は見送り」と通知されます。放置するより相手のためになります。",
                      rows: [["会社", a.company], ["見積金額", money(a.gaku)]],
                      okLabel: "見送りを伝える",
                      onOk: () => {
                        setDeclined((p) => [...p, `${j.id}-${a.company}`]);
                        setConfirm(null); say(`${a.company} に見送りを伝えました`);
                      },
                    })}>今回は見送る</Btn>
                  )}
                </div>
              </DenpyoCard>
            );
          })}

          {gone.length > 0 && (
            <>
              <h2 className="text-[13px] font-extrabold mb-2 mt-5" style={{ color: C.sumi }}>
                見送った応募（{gone.length}）
              </h2>
              {gone.map((a) => (
                <DenpyoCard key={a.id} tone={TONE.off}>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold" style={{ color: C.usu }}>{a.company}</span>
                    <span className="flex-1" />
                    <span className="text-[13px]" style={{ color: C.usu, fontFamily: MONO }}>{money(a.gaku)}</span>
                  </div>
                </DenpyoCard>
              ))}
            </>
          )}

          <p className="text-[11px] text-center" style={{ color: C.usu }}>
            やり取りを開いて「＋」から取引を依頼すると、この案件の取引が立ち上がります。
          </p>
        </div>
      </>
    );
  };

  /* ── メッセージ一覧（案件ごと＋会社への直接） ── */
  const Messages = () => {
    const rows = Object.keys(threads)
      .filter((k) => (threads[k] || []).length > 0)
      .map((k) => ({ cv: convOf(k), list: threads[k] }));
    return (
      <>
        <Header title="メッセージ" />
        <div className="p-3">
          {plan !== "prem" && (
            <div className="flex items-center gap-2 p-2 mb-3 rounded-sm"
              style={{ background: C.kami, border: `1px solid ${C.ki}` }}>
              <span className="text-[11px] font-extrabold px-1.5 py-[2px] rounded-sm"
                style={{ background: C.ki, color: C.sumi }}>{L.name}</span>
              <span className="text-[12px]" style={{ color: C.sumi }}>
                やり取りは{lim(L.send)}件まで（1件の中は送受信無制限／今月あと {Math.max(0, L.send - usedMsg.length)}件）
              </span>
            </div>
          )}

          <Legend open={legend} onClick={() => setLegend(!legend)} items={[
            [C.aka, "未読あり・未確認のスカウト"],
            [C.ki, "案件のやり取り"],
            [C.keisen, "直接のやり取り"],
          ]} />

          {invites.length > 0 && (
            <div className="mb-5">
              <button onClick={() => setInvOpen(!invOpen)}
                className="w-full flex items-center gap-2 px-3 py-2.5 mb-3 rounded-sm"
                style={{ background: C.sumi }}>
                <span className="text-[13px] font-extrabold" style={{ color: C.ki }}>
                  届いたスカウト・見積依頼
                </span>
                <span className="text-[11px] font-bold px-1.5 py-[2px] rounded-sm"
                  style={{ background: C.ki, color: C.sumi }}>{invites.length}件</span>
                {unreadInv > 0 && (
                  <span className="text-[11px] px-1.5 py-[1px] rounded-full font-bold"
                    style={{ background: C.aka, color: "#fff" }}>未読{unreadInv}</span>
                )}
                <span className="flex-1" />
                <span className="text-[13px] font-extrabold" style={{ color: C.ki }}>{invOpen ? "▲" : "▼"}</span>
              </button>
              <div className="items-center gap-2 mb-2" style={{ display: invOpen ? "flex" : "none" }}>
                <span className="flex-1" />
                {L.recv === "pt"
                  ? <span className="text-[10px] font-bold px-1.5 py-[2px] rounded-sm"
                      style={{ background: invitePt > 0 ? C.midori : C.usu, color: "#fff" }}>
                      閲覧ポイント {invitePt}
                    </span>
                  : <span className="text-[10px] font-bold px-1.5 py-[2px] rounded-sm"
                      style={{ background: C.midori, color: "#fff" }}>何件でも読めます</span>}
              </div>
              {invOpen && invites.map((inv) => (
                <button key={inv.id} onClick={() => openInvite(inv)} className="block w-full text-left">
                  <DenpyoCard tone={inv.read ? "plain" : "aka"}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Chip solid color={inv.type === "見積依頼" ? C.midori : C.sumi}>{inv.type}</Chip>
                      {inv.replied && <Chip color={C.usu}>返信済</Chip>}
                      <span className="flex-1" />
                      <span className="text-[10px]" style={{ color: C.usu, fontFamily: MONO }}>{inv.date}</span>
                    </div>
                    <div className="text-[15px] font-extrabold mb-[2px]" style={{ color: C.sumi }}>
                      {inv.from}
                    </div>
                    {inv.aiteFree && (
                      <div className="mb-1"><Chip color={C.usu}>無料プランのユーザーです</Chip></div>
                    )}
                    <div className="flex items-center gap-1.5">
                      {!seenInv(inv.id) && !canViewInv(inv.id) &&
                        <Lock size={13} style={{ color: C.usu, flexShrink: 0 }} />}
                      <span className="text-[13px] truncate" style={{ color: C.usu }}>
                        {seenInv(inv.id) ? inv.text
                          : canViewInv(inv.id)
                            ? (L.recv === "pt" ? "閲覧ポイント1で開く" : "タップで開く")
                            : "今月の閲覧上限に達しています"}
                      </span>
                      <ChevronRight size={16} style={{ color: C.usu, flexShrink: 0, marginLeft: "auto" }} />
                    </div>
                  </DenpyoCard>
                </button>
              ))}
            </div>
          )}

          <h2 className="text-[13px] font-extrabold mb-2" style={{ color: C.sumi }}>やり取り</h2>
          {rows.length === 0 && (
            <p className="text-[13px] py-8 text-center" style={{ color: C.usu }}>
              やり取りはまだありません。案件に応募するか、会社一覧からメッセージを送ると始まります。
            </p>
          )}
          {rows.map(({ cv, list }) => {
            const last = list[list.length - 1];
            const n = unread(cv.key);
            const locked = !canMsg(cv.key);
            const tx = txs.find((x) => x.convKey === cv.key);
            return (
              <button key={cv.key} onClick={() => openThread(cv)} className="block w-full text-left">
                <DenpyoCard tone={n > 0 ? "aka" : cv.jobId ? "ki" : "plain"}>
                  <div className="flex items-center gap-1.5 mb-[2px]">
                    <Chip solid color={cv.jobId ? C.sumi : C.usu}>{cv.jobId ? "案件" : "直接"}</Chip>
                    <span className="flex-1" />
                    <span className="text-[10px] flex-shrink-0" style={{ color: C.usu, fontFamily: MONO }}>{last.t}</span>
                  </div>
                  <div className="text-[15px] font-extrabold truncate" style={{ color: C.sumi }}>{cv.title}</div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[12px]" style={{ color: C.usu }}>{cv.partner}</span>
                    {invites.some((v) => v.from === cv.partner && v.aiteFree) &&
                      <Chip color={C.usu}>無料プランのユーザーです</Chip>}
                  </div>
                  {tx && <div className="mb-1"><Chip color={C.midori}>取引あり・{tx.status}</Chip></div>}
                  <div className="flex items-center gap-1.5">
                    {locked && <Lock size={13} style={{ color: C.usu, flexShrink: 0 }} />}
                    {last.file && <Paperclip size={13} style={{ color: C.usu, flexShrink: 0 }} />}
                    <span className="text-[13px] truncate" style={{ color: locked ? C.usu : C.sumi }}>
                      {locked ? "上限に達しています" : (last.file ? last.file.name : last.text)}
                    </span>
                    <span className="flex-1" />
                    {n > 0 && <span className="text-[11px] px-1.5 py-[1px] rounded-full flex-shrink-0"
                      style={{ background: C.aka, color: "#fff" }}>{n}</span>}
                    <ChevronRight size={16} style={{ color: C.usu, flexShrink: 0 }} />
                  </div>
                </DenpyoCard>
              </button>
            );
          })}
        </div>
      </>
    );
  };

  /* ── やり取り（この中から取引を依頼する） ── */
  const Thread = ({ cv }) => {
    const list = threads[cv.key] || [];
    const job = cv.jobId ? jobs.find((x) => x.id === cv.jobId) : null;
    const tx = txs.find((x) => x.convKey === cv.key);
    const send = () => { if (!draft.trim()) return; postMsg(cv.key, { me: true, text: draft }); setDraft(""); };
    return (
      <>
        <Header title={cv.title} back={() => { setMsgJob(null); setAttachOpen(false); }}
          onTitle={job ? () => { setMsgJob(null); openJob(job); } : undefined}
          right={job ? (
            <button onClick={() => toggleFav(job.id)} className="p-1" aria-label="お気に入り">
              <Star size={20} style={{ color: isFav(job.id) ? C.ki : "rgba(255,255,255,.5)" }}
                fill={isFav(job.id) ? C.ki : "none"} strokeWidth={2.2} />
            </button>
          ) : undefined} />
        <div className="px-3 py-2" style={{ background: C.kami, borderBottom: `1px solid ${C.keisen}` }}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Chip solid color={cv.jobId ? C.sumi : C.usu}>{cv.jobId ? "案件のやり取り" : "直接のやり取り"}</Chip>
            {job && <Chip color={statusColor(job.status)}>{job.status}</Chip>}
            <button onClick={() => setCompany(cv.partner)} className="flex items-center gap-1">
              <span className="text-[13px] font-extrabold underline" style={{ color: C.sumi }}>{cv.partner}</span>
              <ChevronRight size={14} style={{ color: C.usu }} />
            </button>
          </div>
          {tx && (
            <button onClick={() => { setMsgJob(null); clearNav(); setTab("docs"); setDocTab("tx"); setTxOpen(tx); }}
              className="flex items-center gap-1.5 mt-1">
              <Chip color={C.midori}>この案件の取引：{tx.status}</Chip>
              <ChevronRight size={13} style={{ color: C.usu }} />
            </button>
          )}
        </div>

        <div className="p-3 pb-32">
          {list.length === 0 && (
            <p className="text-[13px] py-10 text-center" style={{ color: C.usu }}>
              まだやり取りはありません。条件の確認から始めましょう。
            </p>
          )}
          {list.map((m, i) => (
            <div key={i} className={`flex mb-2 ${m.me ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%]">
                {m.text && (
                  <div className="px-3 py-2 text-[14px] rounded-sm" style={{
                    background: m.me ? C.ki : C.kami,
                    border: `1px solid ${m.me ? C.ki : C.keisen}`, color: C.sumi,
                  }}>{m.text}</div>
                )}
                {m.file && (
                  <button onClick={() => say(`${m.file.name} を開きました`)}
                    className="flex items-center gap-2 px-3 py-2 mt-1 w-full text-left rounded-sm"
                    style={{ background: C.kami, border: `1px solid ${m.file.type === "資料" ? C.keisen : C.midori}` }}>
                    <FileText size={17} style={{ color: m.file.type === "資料" ? C.usu : C.midori, flexShrink: 0 }} />
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold truncate" style={{ color: C.sumi }}>{m.file.name}</div>
                      <div className="text-[10px]" style={{ color: C.usu }}>
                        {m.file.type}{m.file.gaku ? `・${yen(m.file.gaku)}` : ""}
                      </div>
                    </div>
                  </button>
                )}
                <div className="flex items-center gap-1 mt-1"
                  style={{ justifyContent: m.me ? "flex-end" : "flex-start" }}>
                  {m.me && m.read && (
                    <span className="flex items-center gap-[2px] text-[10px] font-bold" style={{ color: C.midori }}>
                      <CheckCheck size={12} />既読
                    </span>
                  )}
                  <span className="text-[10px]" style={{ color: C.usu, fontFamily: MONO }}>{m.t}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="fixed bottom-0 left-1/2 w-full max-w-md z-40"
          style={{ transform: "translateX(-50%)", background: C.kami, borderTop: `1px solid ${C.keisen}` }}>
          {attachOpen && (
            <div className="p-2" style={{ borderBottom: `1px solid ${C.keisen}` }}>
              {!tx && (
                <button onClick={() => {
                  const est = estOf(cv.key);
                  setConfirm({
                    title: "この会社に取引を依頼しますか",
                    note: est
                      ? "受け取っている見積書の内容を確認してください。金額はそのまま注文書に入ります。"
                      : "次の画面で注文書をつくります。金額と工期はそこで決められます。",
                    doc: est ? {
                      name: est.name,
                      rows: [
                        ["提出元", cv.partner],
                        ["工事名", job ? job.name : cv.title],
                        ["見積金額", yen(est.gaku)],
                        ["消費税", yen(Math.floor(est.gaku * 0.1))],
                        ["合計", yen(Math.floor(est.gaku * 1.1))],
                      ],
                    } : null,
                    rows: [
                      ["相手", cv.partner],
                      ["やり取り", cv.jobId ? "案件のやり取りから" : "直接のやり取りから"],
                      ["案件", job ? job.name : "案件に紐づかない取引"],
                    ],
                    check: est ? "見積書の内容を確認しました" : null,
                    okLabel: "注文書の作成に進む",
                    onOk: () => {
                      setOForm({
                        partner: cv.partner, kouji: job ? job.name : cv.title, basho: job ? job.site : "",
                        gaku: est ? String(est.gaku)
                          : (job && job.mode === "指値" ? String(job.shizane) : ""),
                        tanka: job && job.keishiki === "応援（常用）" ? String(job.tanka) : "",
                        keishiki: job && job.keishiki === "応援（常用）" ? "人工" : "請負",
                        kokiA: job ? job.kokiA : "", kokiB: job ? job.kokiB : "",
                        shiharai: job ? job.saito : "", note: "", locked: !!est,
                      });
                      unlockTab("docs", "「取引」タブが使えるようになりました");
                      setConfirm(null); setAttachOpen(false); setMsgJob(null); clearNav();
                      setTab("docs"); setDocTab("tx"); setTxForm({ kind: "order", cv });
                    },
                  });
                }} className="w-full py-3 mb-2 rounded-sm text-[13px] font-extrabold flex items-center justify-center gap-1.5"
                  style={{ background: C.ki, color: C.sumi }}>
                  <Briefcase size={15} />この会社に取引を依頼する
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <label className="py-3 rounded-sm text-[13px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{ background: C.sumi, color: "#fff" }}>
                  <Paperclip size={15} />資料を送る
                  <input type="file" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    postMsg(cv.key, { me: true, file: { name: f.name, type: "資料" } });
                    setAttachOpen(false); say("資料を送りました");
                  }} />
                </label>
                <button onClick={() => {
                  setComposeJob({ id: cv.key, name: cv.title, hacchu: cv.partner });
                  setForm({ aite: cv.partner, kouji: cv.title, basho: job ? job.site : "",
                    koki: job ? range(job.kokiA, job.kokiB) : "", gaku: "" });
                  setCompose("estimate"); setAttachOpen(false);
                }} className="py-3 rounded-sm text-[13px] font-extrabold flex items-center justify-center gap-1.5"
                  style={{ background: C.midori, color: "#fff" }}>
                  <FileText size={15} />見積書を送る
                </button>
              </div>
            </div>
          )}
          <div className="flex gap-2 p-2">
            <button onClick={() => setAttachOpen(!attachOpen)} className="px-3 rounded-sm"
              style={{ background: attachOpen ? C.ki : C.yojo }} aria-label="添付">
              <Plus size={19} style={{ color: C.sumi, transform: attachOpen ? "rotate(45deg)" : "none" }} />
            </button>
            <input value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()} placeholder="メッセージを書く"
              className="flex-1 px-3 py-2 text-[15px] outline-none"
              style={{ border: `1px solid ${C.keisen}`, borderRadius: 4, color: C.sumi }} />
            <button onClick={send} className="px-4 rounded-sm" style={{ background: C.sumi }} aria-label="送信">
              <Send size={17} color="#fff" />
            </button>
          </div>
        </div>
      </>
    );
  };

  /* ── 取引 ── */
  const patchTx = (id, fn, logText) => {
    setTxs((p) => p.map((x) => {
      if (x.id !== id) return x;
      const nx = fn(x);
      return logText ? { ...nx, log: [...x.log, { t: today2(), text: logText }] } : nx;
    }));
    setTxOpen((o) => o && o.id === id ? { ...fn(o), log: o.log } : o);
  };
  const today2 = () => new Date().toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const overdue = (v) => v.state !== "入金済" && v.due && v.due < todayISO();

  const txNext = (tx) => {
    const pend = tx.orders.find((o) => !o.ukesho);
    if (pend) return tx.role === "uke"
      ? { label: `注文書 No.${pend.no} の請書を返す`, tone: C.aka } : { label: "請書の返送待ち", tone: C.usu };
    if (tx.status === "完了申請中") return tx.role === "moto"
      ? { label: "取引完了を承認する", tone: C.sumi } : { label: "完了の承認待ち", tone: C.usu };
    if (tx.status === "完了") return { label: "完了", tone: C.midori };
    const v = tx.invoices.find((x) => x.state !== "入金済");
    if (v) {
      if (tx.role === "uke" && v.state === "支払済") return { label: "入金を確認する", tone: C.midori };
      if (tx.role === "moto" && v.state === "提出済") return { label: "請求を承認する", tone: C.sumi };
      if (tx.role === "moto" && v.state === "承認済") return { label: "支払を登録する", tone: C.sumi };
      return { label: "相手の対応待ち", tone: C.usu };
    }
    return tx.role === "uke"
      ? { label: "日報の登録・請求書の作成", tone: C.sumi } : { label: "進行中", tone: C.usu };
  };

  /* 書類の中身を確認する */
  const DocView = ({ doc }) => {
    const { tx, order, inv } = doc;
    const rows = order
      ? [
          ["書類", `注文書 No.${order.no}`],
          ["発行日", order.t],
          ["注文者", tx.role === "uke" ? tx.partner : "高橋工業"],
          ["請負者", tx.role === "uke" ? "高橋工業" : tx.partner],
          ["工事名", tx.kouji],
          ["工事場所", order.basho || "—"],
          ["工期", range(order.kokiA, order.kokiB)],
          ["契約の形", order.keishiki],
          [order.keishiki === "人工" ? "人工単価" : "請負代金",
            order.keishiki === "人工" ? `${yen(order.tanka)}／人工` : yen(order.gaku)],
          ["消費税", order.keishiki === "人工" ? "—" : yen(Math.floor(order.gaku * 0.1))],
          ["支払条件", `${tx.shime}締め／${tx.shiharai}払い`],
          ["特記事項", order.note || "—"],
          ["注文請書", order.ukesho ? `返送済（${order.ukesho}）` : "未返送"],
        ]
      : [
          ["書類", "請求書"],
          ["発行日", inv.t],
          ["請求元", tx.role === "uke" ? "高橋工業" : tx.partner],
          ["請求先", tx.role === "uke" ? tx.partner : "高橋工業"],
          ["工事名", tx.kouji],
          ["対象の注文書", `No.${tx.orders.find((o) => o.id === inv.orderId)?.no ?? "—"}`],
          ...(inv.month ? [["対象月", `${monthLabel(inv.month)}（延べ${inv.ninku}人工）`]] : []),
          ["小計", yen(inv.gaku)],
          ["消費税", yen(Math.floor(inv.gaku * 0.1))],
          ["合計", yen(Math.floor(inv.gaku * 1.1))],
          ["支払期日", fmt(inv.due)],
          ["状態", inv.state],
          ...(inv.paidOn ? [["入金日", fmt(inv.paidOn)]] : []),
        ];
    return (
      <>
        <Header title={order ? `注文書 No.${order.no}` : "請求書"} back={() => setDocView(null)} />
        <div className="p-3">
          <DenpyoCard tone="ki">
            {rows.map(([k, v], i) => (
              <div key={i} className="flex gap-2 py-[5px]"
                style={{ borderBottom: i < rows.length - 1 ? `1px dashed ${C.keisen}` : "none" }}>
                <span className="text-[12px] w-24 flex-shrink-0" style={{ color: C.usu }}>{k}</span>
                <span className="text-[13px] font-bold" style={{ color: C.sumi }}>{v}</span>
              </div>
            ))}
          </DenpyoCard>
          <Btn onClick={() => say("PDFを書き出しました")}>PDFで保存する</Btn>
        </div>
      </>
    );
  };

  /* 注文書をつくる（追加工事は2枚目以降として発行する） */
  const OrderForm = ({ cv, tx, req }) => {
    const rows = [
      ["相手", oForm.partner],
      ["工事名", oForm.kouji],
      ["工事場所", oForm.basho || "—"],
      ["工期", range(oForm.kokiA, oForm.kokiB)],
      ["契約の形", oForm.keishiki],
      [oForm.keishiki === "人工" ? "人工単価" : "請負代金",
        oForm.keishiki === "人工" ? `${yen(oForm.tanka)}／人工` : yen(oForm.gaku)],
      ["支払条件", oForm.shiharai || "翌月末"],
      ["特記事項", oForm.note || "—"],
    ];
    const submit = () => {
      const order = {
        id: Date.now(), no: tx ? tx.orders.length + 1 : 1, keishiki: oForm.keishiki,
        gaku: Number(oForm.gaku) || 0, tanka: Number(oForm.tanka) || 0,
        kokiA: oForm.kokiA, kokiB: oForm.kokiB, basho: oForm.basho,
        note: oForm.note, t: today2(), ukesho: null,
      };
      if (tx) {
        patchTx(tx.id, (x) => ({
          ...x, orders: [...x.orders, order],
          requests: (x.requests || []).map((r) => req && r.id === req.id ? { ...r, status: "発行済" } : r),
        }),
          `追加の注文書 No.${order.no} を送信しました（${yen(order.gaku)}）`);
        if (tx.convKey) postMsg(tx.convKey, { me: true, file: { name: `注文書No.${order.no}_${tx.kouji}.pdf`, type: "注文書" } });
      } else {
        setTxs((p) => [{
          id: Date.now() + 1, role: "moto", partner: oForm.partner, kouji: oForm.kouji,
          convKey: cv ? cv.key : `c:${oForm.partner}`, jobId: cv ? cv.jobId : null,
          status: "進行中", shime: "末日", shiharai: oForm.shiharai || "翌月末",
          orders: [order], reports: [], invoices: [],
          log: [{ t: today2(), text: "注文書を送信しました" }],
        }, ...p]);
        if (cv) postMsg(cv.key, { me: true, file: { name: `注文書_${oForm.kouji}.pdf`, type: "注文書" } });
      }
      setOForm({ partner: "", kouji: "", basho: "", gaku: "", tanka: "", keishiki: "請負", kokiA: "", kokiB: "", shiharai: "", note: "", locked: false });
      unlockTab("docs", "「取引」タブが使えるようになりました");
      setConfirm(null); setTxForm(null); setTab("docs"); setDocTab("tx"); say("注文書を送信しました");
    };
    return (
      <>
        <Header title={tx ? `追加の注文書（No.${tx.orders.length + 1}）` : "注文書をつくる"}
          back={() => setTxForm(null)} />
        <div className="p-3">
          <DenpyoCard tone="ki">
            <Row icon={Building2} label="相手" value={oForm.partner} />
            <Row label="やり取り" value={cv ? (cv.jobId ? "案件のやり取りから" : "直接のやり取りから") : "この取引に追加"} />
          </DenpyoCard>
          {tx && (
            <div className="p-2 mb-3 rounded-sm" style={{ background: C.kami, border: `1px solid ${C.keisen}` }}>
              <p className="text-[12px]" style={{ color: C.usu }}>
                追加工事は新しい注文書として発行します。請求書はこの注文書を指定して出せます。
              </p>
            </div>
          )}
          <div className="mb-3">
            <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>契約の形</span>
            <Radio options={["請負", "人工"]} value={oForm.keishiki}
              onChange={(v) => setOForm({ ...oForm, keishiki: v })} />
          </div>
          <Field label="工事名" value={oForm.kouji}
            onChange={(v) => setOForm({ ...oForm, kouji: v })} placeholder="浦安 事務所ビル 内装" />
          <Field label="工事場所" value={oForm.basho}
            onChange={(v) => setOForm({ ...oForm, basho: v })} placeholder="浦安市入船4-1-1" />
          {oForm.keishiki === "請負"
            ? (oForm.locked ? (
                <div className="mb-3">
                  <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
                    請負代金（税抜）
                  </span>
                  <div className="px-3 py-2 rounded-sm flex items-center gap-2"
                    style={{ background: C.yojo, border: `1px solid ${C.keisen}` }}>
                    <Lock size={15} style={{ color: C.usu, flexShrink: 0 }} />
                    <span className="text-[15px] font-extrabold" style={{ color: C.sumi, fontFamily: MONO }}>
                      {yen(oForm.gaku)}
                    </span>
                  </div>
                  <span className="block text-[11px] mt-1" style={{ color: C.usu }}>
                    受け取った見積書の金額です。変更するには相手に見積書を出し直してもらってください。
                  </span>
                </div>
              ) : (
                <Field label="請負代金（税抜）" type="number" value={oForm.gaku}
                  onChange={(v) => setOForm({ ...oForm, gaku: v })} placeholder="340000" />
              ))
            : <Field label="人工単価（税抜・1人工あたり）" type="number" value={oForm.tanka}
                onChange={(v) => setOForm({ ...oForm, tanka: v })} placeholder="22000"
                hint="請求は日報の延べ人工から月ごとに計算します" />}
          <DateRange label="工期（必須）" a={oForm.kokiA} b={oForm.kokiB}
            onA={(v) => setOForm({ ...oForm, kokiA: v })} onB={(v) => setOForm({ ...oForm, kokiB: v })} />
          <Field label="支払条件（必須）" value={oForm.shiharai}
            onChange={(v) => setOForm({ ...oForm, shiharai: v })} placeholder="翌月末"
            hint="建設業法で注文書への記載が必要な項目です" />
          {(!oForm.kokiA || !oForm.kokiB || !oForm.shiharai) && (
            <p className="text-[12px] mb-3" style={{ color: C.aka }}>
              工期と支払条件は必須です。どちらも入れないと送信できません。
            </p>
          )}
          <Field label="特記事項" value={oForm.note}
            onChange={(v) => setOForm({ ...oForm, note: v })} placeholder="追加：north面のハネ出し" />
          {canIssue ? (
            <Btn tone="ki"
              disabled={!oForm.kouji || !oForm.kokiA || !oForm.kokiB || !oForm.shiharai
                || (oForm.keishiki === "請負" ? !oForm.gaku : !oForm.tanka)}
              onClick={() => setConfirm({
                title: "この内容で注文書を送りますか",
                note: "送信すると相手に届きます。金額と工期は送信後に変更できません。",
                rows, okLabel: "この内容で送信する", onOk: submit,
              })}>内容を確認して送信する</Btn>
          ) : (
            <div className="p-3 rounded-sm" style={{ background: C.ki }}>
              <p className="text-[13px] font-extrabold mb-1" style={{ color: C.sumi }}>
                {!R.issue ? `${R.name}のロールでは注文書を発行できません`
                          : "注文書の発行はスタンダード以上の機能です"}
              </p>
              <p className="text-[12px] mb-3" style={{ color: C.sumi }}>
                {!R.issue ? "代表者または経理・事務のロールに切り替えてください。"
                          : "受け取りと請書の返送はどのプランでも無料です。"}
              </p>
              <Btn onClick={() => { clearNav(); setTab("me"); }}>
                {!R.issue ? "担当を切り替える" : "プランを見る"}
              </Btn>
            </div>
          )}
        </div>
      </>
    );
  };

  /* 追加工事の注文書を依頼する（受注側から） */
  const AddReqForm = ({ tx }) => {
    const rows = [
      ["工事内容", qForm.naiyou || "—"],
      ["想定金額", qForm.gaku ? yen(qForm.gaku) : "相談"],
      ["希望工期", range(qForm.kokiA, qForm.kokiB)],
    ];
    return (
      <>
        <Header title="追加工事の注文書を依頼" back={() => setTxForm(null)} />
        <div className="p-3">
          <div className="p-2 mb-3 rounded-sm" style={{ background: C.kami, border: `1px solid ${C.keisen}` }}>
            <p className="text-[12px]" style={{ color: C.usu }}>
              現場で発生した追加分について、発注者に注文書の発行を依頼します。
              注文書が出て請書を返した後でないと、追加分は請求できません。
            </p>
          </div>
          <Field label="追加工事の内容" value={qForm.naiyou}
            onChange={(v) => setQForm({ ...qForm, naiyou: v })} placeholder="north面のハネ出し" />
          <Field label="想定金額（税抜・空欄なら相談）" type="number" value={qForm.gaku}
            onChange={(v) => setQForm({ ...qForm, gaku: v })} placeholder="240000" />
          <DateRange label="希望工期" a={qForm.kokiA} b={qForm.kokiB}
            onA={(v) => setQForm({ ...qForm, kokiA: v })} onB={(v) => setQForm({ ...qForm, kokiB: v })} />
          <Btn tone="ki" disabled={!qForm.naiyou}
            onClick={() => setConfirm({
              title: "この内容で追加工事の注文書を依頼しますか",
              note: "発注者に届きます。発注者が注文書を出したら、請書を返してください。",
              rows, okLabel: "この内容で依頼する",
              onOk: () => {
                patchTx(tx.id, (x) => ({
                  ...x, requests: [...(x.requests || []), {
                    id: Date.now(), naiyou: qForm.naiyou, gaku: Number(qForm.gaku) || 0,
                    kokiA: qForm.kokiA, kokiB: qForm.kokiB, t: today2(), status: "依頼中",
                  }],
                }), `追加工事の注文書を依頼しました（${qForm.naiyou}）`);
                if (tx.convKey) postMsg(tx.convKey, { me: true,
                  text: `追加工事「${qForm.naiyou}」の注文書をお願いできますか。` });
                setQForm({ naiyou: "", gaku: "", kokiA: "", kokiB: "" });
                setConfirm(null); setTxForm(null); say("追加工事の注文書を依頼しました");
              },
            })}>内容を確認して依頼する</Btn>
        </div>
      </>
    );
  };

  /* 作業日報（全業種共通の進捗） */
  const ReportForm = ({ tx }) => (
    <>
      <Header title="作業日報" back={() => setTxForm(null)} />
      <div className="p-3">
        <div className="p-2 mb-3 rounded-sm" style={{ background: C.kami, border: `1px solid ${C.keisen}` }}>
          <p className="text-[12px]" style={{ color: C.usu }}>
            日報がそのまま進捗になります。発注側の画面にも同じものが表示されます。
          </p>
        </div>
        <label className="block mb-3">
          <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>作業日</span>
          <input type="date" value={rForm.date} onChange={(e) => setRForm({ ...rForm, date: e.target.value })}
            className="w-full px-3 py-2 text-[15px] outline-none"
            style={{ background: C.kami, border: `1px solid ${C.keisen}`, borderRadius: 4, color: C.sumi }} />
        </label>
        <Field label="人数" type="number" value={rForm.ninzu}
          onChange={(v) => setRForm({ ...rForm, ninzu: v })} placeholder="4" />
        <Field label="作業内容" value={rForm.naiyou}
          onChange={(v) => setRForm({ ...rForm, naiyou: v })} placeholder="北面の建地建て込み、資材搬入" />
        <Field label="備考（天候・特記）" value={rForm.note}
          onChange={(v) => setRForm({ ...rForm, note: v })} placeholder="午後から小雨" />
        <Btn tone="ki" disabled={!rForm.date || !rForm.naiyou}
          onClick={() => {
            patchTx(tx.id, (x) => ({
              ...x, reports: [...x.reports, { id: Date.now(), ...rForm, ninzu: Number(rForm.ninzu) || 0 }],
            }));
            setRForm({ date: todayISO(), ninzu: "", naiyou: "", note: "" });
            setTxForm(null); say("作業日報を登録しました");
          }}>日報を登録する</Btn>
      </div>
    </>
  );

  /* 請求書（注文書を1枚だけ選ぶ。超過は警告する） */
  const InvoiceForm = ({ tx }) => {
    const confirmed = tx.orders.filter((o) => o.ukesho);
    const ord = confirmed.find((o) => o.id === iForm.orderId) || null;
    const ninku = ord?.keishiki === "人工";
    const billed = ord ? orderBilled(tx, ord.id) : 0;
    const rest = ord && !ninku ? Math.max(0, ord.gaku - billed) : 0;
    const months = ninku ? ninkuByMonth(tx.reports) : [];
    const billedMonths = tx.invoices.filter((v) => v.orderId === ord?.id).map((v) => v.month).filter(Boolean);
    const sel = months.find(([k]) => k === iForm.month);
    const monthNinku = sel ? sel[1] : 0;
    const gaku = !ord ? 0 : ninku
      ? (iForm.kind === "全額" ? monthNinku * ord.tanka : Number(iForm.gaku) || 0)
      : (iForm.kind === "全額" ? rest : Number(iForm.gaku) || 0);
    const over = ord && !ninku && (billed + gaku) > ord.gaku;
    const overAmt = over ? billed + gaku - ord.gaku : 0;

    const submit = () => {
      patchTx(tx.id, (x) => ({
        ...x, invoices: [...x.invoices, {
          id: Date.now(), orderId: ord.id, gaku, kind: iForm.kind, due: iForm.due, state: "提出済",
          month: ninku ? iForm.month : null, ninku: ninku ? monthNinku : 0, t: today2(),
        }],
      }), `注文書No.${ord.no}に対して請求書を提出しました（${yen(gaku)}）`);
      if (tx.convKey) postMsg(tx.convKey, { me: true, file: { name: `請求書_${tx.kouji}.pdf`, type: "請求書", gaku } });
      setIForm({ orderId: null, kind: "全額", gaku: "", due: "", month: "" });
      setConfirm(null); setTxForm(null); say("請求書を提出しました");
    };

    return (
      <>
        <Header title="請求書をつくる" back={() => setTxForm(null)} />
        <div className="p-3">
          <div className="mb-3">
            <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
              対象の注文書（1枚の請求書に複数の注文書は載せられません）
            </span>
            {confirmed.length === 0
              ? <p className="text-[12px] py-2" style={{ color: C.usu }}>請書が返っている注文書がありません。</p>
              : confirmed.map((o) => {
                const b = orderBilled(tx, o.id);
                const on = iForm.orderId === o.id;
                return (
                  <button key={o.id} onClick={() => setIForm({ orderId: o.id, kind: "全額", gaku: "", due: iForm.due, month: "" })}
                    className="w-full text-left p-2.5 mb-2 rounded-sm"
                    style={{ background: on ? C.ki : C.kami, border: `1px solid ${on ? C.ki : C.keisen}` }}>
                    <div className="flex items-center gap-2">
                      <FileText size={16} style={{ color: C.sumi, flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-extrabold" style={{ color: C.sumi }}>
                          注文書 No.{o.no}{o.note && `（${o.note}）`}
                        </div>
                        <div className="text-[11px]" style={{ color: C.usu, fontFamily: MONO }}>
                          {o.keishiki === "人工" ? `${yen(o.tanka)}／人工`
                            : `${yen(o.gaku)}・請求済 ${yen(b)}・残り ${yen(Math.max(0, o.gaku - b))}`}
                        </div>
                      </div>
                      {on && <Check size={17} style={{ color: C.sumi }} />}
                    </div>
                  </button>
                );
              })}
          </div>

          {ord && ninku && (
            <div className="mb-3">
              <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
                請求する月（日報から集計しています）
              </span>
              {months.length === 0
                ? <p className="text-[12px] py-2" style={{ color: C.usu }}>日報がまだありません。</p>
                : months.map(([k, n]) => {
                  const done = billedMonths.includes(k);
                  const on = iForm.month === k;
                  return (
                    <button key={k} onClick={() => setIForm({ ...iForm, month: k })} disabled={done}
                      className="w-full text-left p-2.5 mb-2 rounded-sm disabled:opacity-45"
                      style={{ background: on ? C.ki : C.kami, border: `1px solid ${on ? C.ki : C.keisen}` }}>
                      <div className="flex items-center gap-2">
                        <Calendar size={16} style={{ color: C.sumi, flexShrink: 0 }} />
                        <div className="flex-1">
                          <div className="text-[14px] font-extrabold" style={{ color: C.sumi }}>
                            {monthLabel(k)}ぶん
                          </div>
                          <div className="text-[11px]" style={{ color: C.usu, fontFamily: MONO }}>
                            延べ {n}人工 × {yen(ord.tanka)} ＝ {yen(n * ord.tanka)}
                          </div>
                        </div>
                        {done ? <Chip color={C.usu}>請求済</Chip> : on && <Check size={17} style={{ color: C.sumi }} />}
                      </div>
                    </button>
                  );
                })}
            </div>
          )}

          {ord && (
            <>
              <div className="mb-3">
                <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>請求金額</span>
                <Radio options={[ninku ? "延べ人工どおり" : "全額（残り）", "任意の金額"]}
                  value={iForm.kind === "全額" ? (ninku ? "延べ人工どおり" : "全額（残り）") : "任意の金額"}
                  onChange={(v) => setIForm({ ...iForm, kind: v === "任意の金額" ? "任意" : "全額" })} />
              </div>
              {iForm.kind === "任意" && (
                <Field label="請求金額（税抜）" type="number" value={iForm.gaku}
                  onChange={(v) => setIForm({ ...iForm, gaku: v })} placeholder="600000"
                  hint={ninku ? "残業や車両代などの追加がある場合に手入力できます"
                              : "出来高や追加分に応じて自由に入力できます"} />
              )}

              {over && (
                <div className="p-3 mb-3 rounded-sm" style={{ background: C.aka }}>
                  <p className="text-[13px] font-extrabold mb-1" style={{ color: "#fff" }}>
                    注文書の金額を超過しています
                  </p>
                  <p className="text-[12px]" style={{ color: "rgba(255,255,255,.92)" }}>
                    注文書 No.{ord.no}（{yen(ord.gaku)}）に対して合計 {yen(billed + gaku)}、
                    {yen(overAmt)} の超過です。金額を確認するか、発注者へメッセージで確認してください。
                    追加工事であれば、注文書をもう1枚出してもらうのが確実です。
                  </p>
                  {tx.convKey && (
                    <div className="mt-3">
                      <Btn tone="sumi" onClick={() => {
                        clearNav(); setTab("msgs"); openThread(convOf(tx.convKey));
                      }}>メッセージで確認する</Btn>
                    </div>
                  )}
                </div>
              )}

              <label className="block mb-3">
                <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>支払期日</span>
                <input type="date" value={iForm.due} onChange={(e) => setIForm({ ...iForm, due: e.target.value })}
                  className="w-full px-3 py-2 text-[15px] outline-none"
                  style={{ background: C.kami, border: `1px solid ${C.keisen}`, borderRadius: 4, color: C.sumi }} />
                <span className="block text-[11px] mt-1" style={{ color: C.usu }}>
                  締め{tx.shime}／支払{tx.shiharai} の条件です
                </span>
              </label>

              {gaku > 0 && (
                <DenpyoCard>
                  <Row label="小計" value={yen(gaku)} mono />
                  <Row label="消費税" value={yen(Math.floor(gaku * 0.1))} mono />
                  <Row label="合計" value={yen(Math.floor(gaku * 1.1))} mono />
                </DenpyoCard>
              )}

              <Btn tone="ki" disabled={!gaku || !iForm.due || (ninku && !iForm.month)}
                onClick={() => setConfirm({
                  title: "この内容で請求書を出しますか",
                  note: over ? "注文書の金額を超過したまま提出しようとしています。"
                             : "提出すると相手に届きます。提出後は取り下げできません。",
                  rows: [
                    ["対象", `注文書 No.${ord.no}`],
                    ...(iForm.month ? [["対象月", `${monthLabel(iForm.month)}（${monthNinku}人工）`]] : []),
                    ["小計", yen(gaku)],
                    ["消費税", yen(Math.floor(gaku * 0.1))],
                    ["合計", yen(Math.floor(gaku * 1.1))],
                    ["支払期日", fmt(iForm.due)],
                    ...(over ? [["超過", yen(overAmt)]] : []),
                  ],
                  okLabel: over ? "超過を承知で提出する" : "この内容で提出する",
                  onOk: submit,
                })}>内容を確認して提出する</Btn>
            </>
          )}
        </div>
      </>
    );
  };

  const TxView = ({ tx: t0 }) => {
    const tx = txs.find((x) => x.id === t0.id) || t0;
    const uke = tx.role === "uke";
    const billed = invBilled(tx);
    const total = txTotal(tx);
    const hasNinku = tx.orders.some((o) => o.keishiki === "人工");
    return (
      <>
        <Header title={tx.kouji} back={() => setTxOpen(null)} />
        <div className="p-3">
          <DenpyoCard tone={tx.status === "完了" ? "midori" : "ki"}>
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <Chip solid color={uke ? C.sumi : C.usu}>{uke ? "受注（自社が施工）" : "発注（自社が依頼）"}</Chip>
              <Chip color={tx.status === "完了" ? C.midori : C.sumi}>{tx.status}</Chip>
              <Chip color={C.usu}>注文書 {tx.orders.length}枚</Chip>
            </div>
            <button onClick={() => setCompany(tx.partner)} className="flex items-center gap-1 mb-1">
              <span className="text-[15px] font-extrabold underline" style={{ color: C.sumi }}>{tx.partner}</span>
              <ChevronRight size={15} style={{ color: C.usu }} />
            </button>
            {!hasNinku && <Row icon={Banknote} label="注文合計" value={money(total)} mono />}
            <Row label="締め／支払" value={`${tx.shime}／${tx.shiharai}`} />
            <div className="my-2" style={{ borderTop: `1px dashed ${C.keisen}` }} />
            <div className="flex gap-2">
              {(hasNinku ? [["請求済", billed]] : [["請求済", billed], ["残り", Math.max(0, total - billed)]]).map(([l, v]) => (
                <div key={l} className="flex-1 py-2 text-center rounded-sm" style={{ background: C.yojo }}>
                  <div className="text-[15px] font-extrabold" style={{ color: C.sumi, fontFamily: MONO }}>{money(v)}</div>
                  <div className="text-[10px]" style={{ color: C.usu }}>{l}</div>
                </div>
              ))}
            </div>
            {tx.convKey && (
              <div className="mt-3">
                <Btn onClick={() => { clearNav(); setTab("msgs"); openThread(convOf(tx.convKey)); }}>
                  <span className="inline-flex items-center gap-1.5"><MessageSquare size={15} />やり取りを開く</span>
                </Btn>
              </div>
            )}
          </DenpyoCard>

          <h2 className="text-[13px] font-extrabold mb-2" style={{ color: C.sumi }}>注文書</h2>
          {tx.orders.map((o) => (
            <DenpyoCard key={o.id} tone={o.ukesho ? "plain" : "aka"}>
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <Chip solid color={C.sumi}>No.{o.no}</Chip>
                <Chip color={o.ukesho ? C.midori : C.aka}>{o.ukesho ? "請書 返送済" : "請書 未返送"}</Chip>
                <Chip color={C.usu}>{o.keishiki}</Chip>
                <span className="flex-1" />
                <span className="text-[10px]" style={{ color: C.usu, fontFamily: MONO }}>{o.t}</span>
              </div>
              {o.note && <div className="text-[13px] font-bold mb-1" style={{ color: C.sumi }}>{o.note}</div>}
              <Row icon={Banknote} label={o.keishiki === "人工" ? "人工単価" : "請負代金"}
                value={o.keishiki === "人工" ? `${money(o.tanka)}／人工` : money(o.gaku)} mono />
              <Row icon={Calendar} label="工期" value={range(o.kokiA, o.kokiB)} mono />
              {o.keishiki !== "人工" && (
                <Row label="請求済" value={`${money(orderBilled(tx, o.id))}／残り ${money(Math.max(0, o.gaku - orderBilled(tx, o.id)))}`} mono />
              )}
              <div className="mt-2 grid gap-2">
                <Btn onClick={() => setDocView({ tx, order: o })}>
                  <span className="inline-flex items-center gap-1.5"><FileText size={15} />注文書の内容を見る</span>
                </Btn>
                {!o.ukesho && uke && (
                  <>
                    <Btn tone="midori" onClick={() => setConfirm({
                      title: "注文請書を返しますか",
                      note: "返送すると、この注文書の内容に合意したことになります。",
                      rows: [
                        ["注文書", `No.${o.no}`],
                        ["工期", range(o.kokiA, o.kokiB)],
                        [o.keishiki === "人工" ? "人工単価" : "請負代金",
                          o.keishiki === "人工" ? `${yen(o.tanka)}／人工` : yen(o.gaku)],
                        ["支払条件", `${tx.shime}締め／${tx.shiharai}払い`],
                      ],
                      okLabel: "内容に合意して返送する",
                      onOk: () => {
                        patchTx(tx.id, (x) => ({
                          ...x, status: "進行中",
                          orders: x.orders.map((y) => y.id === o.id ? { ...y, ukesho: today2() } : y),
                        }), `注文書 No.${o.no} の請書を返しました`);
                        setConfirm(null); say("注文請書を返しました");
                        unlockTab("photos", "「写真」タブが使えるようになりました");
                      },
                    })}>内容を確認して請書を返す</Btn>
                    <Btn tone="aka" onClick={() => {
                      patchTx(tx.id, (x) => x, `注文書 No.${o.no} を差し戻しました`);
                      say("差し戻しました。相手が注文書を直します");
                    }}>内容が違う（差し戻す）</Btn>
                  </>
                )}
                {!o.ukesho && !uke && (
                  <p className="text-[11px]" style={{ color: C.usu }}>相手の請書を待っています。</p>
                )}
              </div>
            </DenpyoCard>
          ))}
          {(tx.requests || []).filter((r) => r.status === "依頼中").map((r) => (
            <DenpyoCard key={r.id} tone="ki">
              <div className="flex items-center gap-1.5 mb-1">
                <Chip solid color={C.sumi}>追加工事の依頼</Chip>
                <span className="flex-1" />
                <span className="text-[10px]" style={{ color: C.usu, fontFamily: MONO }}>{r.t}</span>
              </div>
              <div className="text-[15px] font-extrabold mb-1" style={{ color: C.sumi }}>{r.naiyou}</div>
              <Row icon={Banknote} label="想定金額" value={r.gaku ? yen(r.gaku) : "相談"} mono />
              <Row icon={Calendar} label="希望工期" value={range(r.kokiA, r.kokiB)} mono />
              <div className="mt-3">
                {uke ? (
                  <p className="text-[12px]" style={{ color: C.usu }}>
                    発注者が注文書を出すのを待っています。
                  </p>
                ) : (
                  <Btn tone="ki" onClick={() => {
                    setOForm({
                      partner: tx.partner, kouji: tx.kouji, basho: tx.orders[0].basho,
                      gaku: String(r.gaku || ""), tanka: "", keishiki: "請負",
                      kokiA: r.kokiA, kokiB: r.kokiB, shiharai: tx.shiharai, note: r.naiyou,
                    });
                    setTxForm({ kind: "order", tx, req: r });
                  }}>この内容で注文書を出す</Btn>
                )}
              </div>
            </DenpyoCard>
          ))}

          {tx.status !== "完了" && (
            uke ? (
              <button onClick={() => { setQForm({ naiyou: "", gaku: "", kokiA: "", kokiB: "" });
                setTxForm({ kind: "addreq", tx }); }}
                className="w-full mb-3 py-2.5 rounded-sm text-[13px] font-extrabold flex items-center justify-center gap-1.5"
                style={{ background: C.kami, color: C.sumi, border: `1px solid ${C.sumi}` }}>
                <Plus size={15} />追加工事の注文書を依頼する
              </button>
            ) : (
              <div className="grid gap-2 mb-3">
                <button onClick={() => {
                  setOForm({
                    partner: tx.partner, kouji: tx.kouji, basho: tx.orders[0].basho, gaku: "", tanka: "",
                    keishiki: "請負", kokiA: "", kokiB: "", shiharai: tx.shiharai, note: "追加工事", locked: false,
                  });
                  setTxForm({ kind: "order", tx });
                }} className="w-full py-2.5 rounded-sm text-[13px] font-extrabold flex items-center justify-center gap-1.5"
                  style={{ background: C.kami, color: C.sumi, border: `1px solid ${C.sumi}` }}>
                  <Plus size={15} />追加工事の注文書を出す
                </button>
                <button onClick={() => {
                  const o = tx.orders[tx.orders.length - 1];
                  setOForm({
                    partner: tx.partner, kouji: tx.kouji, basho: o.basho,
                    gaku: String(o.gaku || ""), tanka: String(o.tanka || ""), keishiki: o.keishiki,
                    kokiA: "", kokiB: "", shiharai: tx.shiharai, note: o.note, locked: false,
                  });
                  setTxForm({ kind: "order", tx });
                  say(`注文書No.${o.no}の内容を複製しました。工期を入れ直してください`);
                }} className="w-full py-2.5 rounded-sm text-[13px] font-extrabold flex items-center justify-center gap-1.5"
                  style={{ background: C.kami, color: C.usu, border: `1px solid ${C.keisen}` }}>
                  <FileText size={15} />前の注文書を複製して出す
                </button>
              </div>
            )
          )}

          {/* 作業日報 */}
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-[13px] font-extrabold" style={{ color: C.sumi }}>作業日報</h2>
            <span className="text-[12px]" style={{ color: C.usu, fontFamily: MONO }}>
              {tx.reports.length}日／延べ{tx.reports.reduce((n, r) => n + r.ninzu, 0)}人工
            </span>
          </div>
          <DenpyoCard>
            {tx.reports.length === 0
              ? <p className="text-[12px] py-2" style={{ color: C.usu }}>まだ日報がありません。</p>
              : tx.reports.map((r, i) => (
                <div key={r.id} className="py-2" style={{ borderTop: i > 0 ? `1px dashed ${C.keisen}` : "none" }}>
                  <div className="flex items-center gap-2 mb-[2px]">
                    <span className="text-[13px] font-extrabold" style={{ color: C.sumi, fontFamily: MONO }}>
                      {fmt(r.date)}
                    </span>
                    <Chip color={C.usu}>{r.ninzu}人</Chip>
                  </div>
                  <div className="text-[13px]" style={{ color: C.sumi }}>{r.naiyou}</div>
                  {r.note && <div className="text-[11px] mt-[2px]" style={{ color: C.usu }}>{r.note}</div>}
                  {(r.comments || []).map((c, k) => (
                    <div key={k} className="flex gap-1.5 mt-1.5 px-2 py-1.5 rounded-sm"
                      style={{ background: C.yojo }}>
                      <MessageSquare size={12} style={{ color: C.usu, marginTop: 2, flexShrink: 0 }} />
                      <span className="text-[12px]" style={{ color: C.sumi }}>{c.text}</span>
                    </div>
                  ))}
                  {!uke && (
                    <div className="flex gap-1.5 mt-1.5">
                      <input value={rptComment[r.id] || ""}
                        onChange={(e) => setRptComment({ ...rptComment, [r.id]: e.target.value })}
                        placeholder="この日報にひとこと"
                        className="flex-1 px-2 py-1.5 text-[13px] outline-none"
                        style={{ border: `1px solid ${C.keisen}`, borderRadius: 4, color: C.sumi }} />
                      <button onClick={() => {
                        const txt = (rptComment[r.id] || "").trim(); if (!txt) return;
                        patchTx(tx.id, (x) => ({ ...x, reports: x.reports.map((y) =>
                          y.id === r.id ? { ...y, comments: [...(y.comments || []), { text: txt }] } : y) }));
                        setRptComment({ ...rptComment, [r.id]: "" }); say("日報にコメントしました");
                      }} className="px-3 rounded-sm" style={{ background: C.sumi }} aria-label="送信">
                        <Send size={14} color="#fff" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            {uke && tx.status !== "完了" && (
              <div className="mt-3">
                <Btn onClick={() => { setRForm({ date: todayISO(), ninzu: "", naiyou: "", note: "" });
                  setTxForm({ kind: "report", tx }); }}>
                  <span className="inline-flex items-center gap-1.5"><Plus size={15} />日報を書く</span>
                </Btn>
              </div>
            )}
          </DenpyoCard>

          {/* 請求 */}
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-[13px] font-extrabold" style={{ color: C.sumi }}>請求</h2>
            {invOntime(tx) > 0 && (
              <span className="text-[11px] font-bold px-1.5 py-[2px] rounded-sm"
                style={{ background: C.midori, color: "#fff" }}>期日内入金 {invOntime(tx)}回</span>
            )}
          </div>
          {tx.invoices.length === 0 && (
            <DenpyoCard><p className="text-[12px]" style={{ color: C.usu }}>まだ請求はありません。</p></DenpyoCard>
          )}
          {tx.invoices.map((v) => {
            const i = INV_STEPS.indexOf(v.state);
            const ontime = v.state === "入金済" && v.paidOn && v.paidOn <= v.due;
            const late = overdue(v);
            const ono = tx.orders.find((o) => o.id === v.orderId);
            return (
              <DenpyoCard key={v.id} tone={v.state === "入金済" ? (ontime ? "midori" : "aka") : late ? "aka" : "ki"}>
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <Chip solid color={C.sumi}>注文書 No.{ono?.no ?? "—"}</Chip>
                  {v.month && <Chip color={C.usu}>{monthLabel(v.month)}ぶん・{v.ninku}人工</Chip>}
                  <span className="flex-1" />
                  <span className="text-[15px] font-extrabold" style={{ color: C.sumi, fontFamily: MONO }}>
                    {money(v.gaku)}
                  </span>
                </div>
                <Row icon={Calendar} label="支払期日" value={fmt(v.due)} mono />
                {v.paidOn && <Row label="入金日" value={fmt(v.paidOn)} mono />}
                <div className="flex gap-[3px] mt-2 mb-1">
                  {INV_STEPS.map((st, k) => (
                    <div key={st} className="flex-1">
                      <div className="h-[5px] rounded-full"
                        style={{ background: k <= i ? (ontime ? C.midori : C.sumi) : C.keisen }} />
                      <div className="text-[9px] mt-[3px] text-center"
                        style={{ color: k === i ? C.sumi : C.usu, fontWeight: k === i ? 800 : 400 }}>{st}</div>
                    </div>
                  ))}
                </div>
                {v.state === "入金済" && (
                  <div className="text-[12px] font-extrabold mt-1" style={{ color: ontime ? C.midori : C.aka }}>
                    {ontime ? "期日内に入金されました（信用情報に加算）" : "期日を過ぎての入金でした"}
                  </div>
                )}
                <div className="mt-2 grid gap-2">
                  <Btn onClick={() => setDocView({ tx, inv: v })}>
                    <span className="inline-flex items-center gap-1.5"><FileText size={15} />請求書の内容を見る</span>
                  </Btn>
                  {!uke && v.state === "提出済" && (
                    <Btn tone="ki" onClick={() => setConfirm({
                      title: "この請求を承認しますか",
                      note: "承認すると支払の対象になります。",
                      rows: [["注文書", `No.${ono?.no}`], ["金額", yen(v.gaku)], ["支払期日", fmt(v.due)]],
                      okLabel: "承認する",
                      onOk: () => {
                        patchTx(tx.id, (x) => ({ ...x, invoices: x.invoices.map((y) =>
                          y.id === v.id ? { ...y, state: "承認済" } : y) }), "請求を承認しました");
                        setConfirm(null); say("請求を承認しました");
                      },
                    })}>請求を承認する</Btn>
                  )}
                  {!uke && v.state === "承認済" && (
                    <Btn tone="midori" onClick={() => {
                      patchTx(tx.id, (x) => ({ ...x, invoices: x.invoices.map((y) =>
                        y.id === v.id ? { ...y, state: "支払済" } : y) }), "支払を登録しました");
                      say("支払を登録しました");
                    }}>支払を登録する</Btn>
                  )}
                  {uke && v.state === "支払済" && (
                    <Btn tone="midori" onClick={() => {
                      patchTx(tx.id, (x) => ({ ...x, invoices: x.invoices.map((y) =>
                        y.id === v.id ? { ...y, state: "入金済", paidOn: todayISO() } : y) }), "入金を確認しました");
                      say("入金を確認しました");
                    }}>入金を確認した</Btn>
                  )}
                  {uke && late && v.state !== "入金済" && (
                    <Btn tone="aka" onClick={() => setPayOpen({
                      id: v.id, role: "seller", partner: tx.partner, kouji: tx.kouji,
                      gaku: v.gaku, due: v.due, status: "期日超過", over: 1, log: [],
                    })}>入金がない（確認を依頼する）</Btn>
                  )}
                </div>
              </DenpyoCard>
            );
          })}
          {uke && tx.status === "進行中" && tx.orders.some((o) => o.ukesho) && (
            <Btn tone="ki" onClick={() => { setIForm({ orderId: null, kind: "全額", gaku: "", due: "", month: "" });
              setTxForm({ kind: "invoice", tx }); }}>請求書をつくる</Btn>
          )}

          {/* 取引完了 */}
          {tx.status !== "完了" && (
            <div className="mt-5">
              <h2 className="text-[13px] font-extrabold mb-2" style={{ color: C.sumi }}>取引の完了</h2>
              <DenpyoCard tone={tx.status === "完了申請中" ? "ki" : "plain"}>
                <p className="text-[12px] mb-3" style={{ color: C.usu }}>
                  完了するまでは請求書を何度でも出せます。受注側が完了を申請し、
                  発注側が承認した時点で取引が閉じます。
                </p>
                {uke && tx.status === "進行中" && (
                  <Btn onClick={() => setConfirm({
                    title: "取引の完了を申請しますか",
                    note: "承認されると、この取引では請求書を出せなくなります。",
                    rows: [["請求済", yen(billed)], ["注文合計", hasNinku ? "人工契約" : yen(total)]],
                    okLabel: "完了を申請する",
                    onOk: () => {
                      patchTx(tx.id, (x) => ({ ...x, status: "完了申請中" }), "取引完了を申請しました");
                      setConfirm(null); say("取引完了を申請しました");
                    },
                  })}>取引完了を申請する</Btn>
                )}
                {uke && tx.status === "完了申請中" && (
                  <p className="text-[13px] font-bold" style={{ color: C.usu }}>発注側の承認を待っています。</p>
                )}
                {!uke && tx.status === "完了申請中" && (
                  <>
                    <Btn tone="midori" onClick={() => {
                      patchTx(tx.id, (x) => ({ ...x, status: "完了" }), "取引完了を承認しました");
                      say("取引完了を承認しました");
                    }}>取引完了を承認する</Btn>
                    <div className="mt-2">
                      <Btn tone="aka" onClick={() => {
                        patchTx(tx.id, (x) => ({ ...x, status: "進行中" }), "完了申請を差し戻しました");
                        say("差し戻しました");
                      }}>まだ残っている（差し戻す）</Btn>
                    </div>
                  </>
                )}
                {!uke && tx.status === "進行中" && (
                  <p className="text-[13px] font-bold" style={{ color: C.usu }}>相手の完了申請を待っています。</p>
                )}
              </DenpyoCard>
            </div>
          )}

          {tx.status === "完了" && (
            <div className="mt-5">
              <h2 className="text-[13px] font-extrabold mb-2" style={{ color: C.sumi }}>次にできること</h2>
              <DenpyoCard tone={TONE.done}>
                <p className="text-[12px] mb-3" style={{ color: C.usu }}>
                  お疲れさまでした。この取引の記録は{tx.partner}の信用情報にも反映されます。
                </p>
                <div className="grid gap-2">
                  {!isFavCo(tx.partner) && (
                    <Btn tone="ki" onClick={() => { toggleFavCo(tx.partner); say(`${tx.partner} をお気に入りに登録しました`); }}>
                      <span className="inline-flex items-center gap-1.5">
                        <Star size={15} />この会社をお気に入りに登録する
                      </span>
                    </Btn>
                  )}
                  <Btn onClick={() => { clearNav(); setTab("msgs"); openThread(convOf(tx.convKey || `c:${tx.partner}`)); }}>
                    次の仕事も同じ会社に頼む
                  </Btn>
                  <Btn onClick={() => say("この取引の工事写真台帳を書き出しました")}>
                    工事写真の台帳を書き出す
                  </Btn>
                </div>
              </DenpyoCard>
            </div>
          )}

          {tx.log.length > 0 && (
            <>
              <h2 className="text-[13px] font-extrabold mb-2 mt-5" style={{ color: C.sumi }}>履歴</h2>
              <DenpyoCard>
                {tx.log.map((l, i) => (
                  <div key={i} className="flex gap-2 py-1">
                    <span className="text-[11px] flex-shrink-0" style={{ color: C.usu, fontFamily: MONO }}>{l.t}</span>
                    <span className="text-[12px]" style={{ color: C.sumi }}>{l.text}</span>
                  </div>
                ))}
              </DenpyoCard>
            </>
          )}
        </div>
      </>
    );
  };

  /* ── 入金がないときの確認・異議申立（遅延は確定してから記録される） ── */
  const setPay = (patch, logText) => setPayOpen((o) => o && ({
    ...o, ...patch,
    log: logText ? [...o.log, { t: today2(), text: logText }] : o.log,
  }));

  const PaymentView = ({ pay: p }) => {
    const step = { "期日超過": 0, "確認中": 1, "支払予定日の申告あり": 2, "異議あり": 2,
      "運営が事実確認中": 3, "解決（記録なし）": 4, "遅延として記録": 4 }[p.status] ?? 0;
    return (
      <>
        <Header title="入金の確認" back={() => setPayOpen(null)} />
        <div className="p-3">
          <DenpyoCard tone={p.status === "遅延として記録" ? "aka"
            : p.status === "解決（記録なし）" ? "midori" : "ki"}>
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <Chip solid color={C.sumi}>自社が請求</Chip>
              <Chip color={p.status === "遅延として記録" ? C.aka : C.midori}>{p.status}</Chip>
            </div>
            <div className="text-[15px] font-extrabold mb-1" style={{ color: C.sumi }}>{p.kouji}</div>
            <Row icon={Building2} label="相手" value={p.partner} />
            <Row icon={Banknote} label="金額" value={yen(p.gaku)} mono />
            <Row icon={Calendar} label="支払期日" value={fmt(p.due)} mono />
          </DenpyoCard>

          <h2 className="text-[13px] font-extrabold mb-2" style={{ color: C.sumi }}>確認の流れ</h2>
          <DenpyoCard>
            {PAY_FLOW.map((f, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5">
                <span className="rounded-full flex items-center justify-center text-[10px] font-extrabold flex-shrink-0"
                  style={{ width: 20, height: 20, background: i <= step ? C.sumi : C.yojo,
                    color: i <= step ? "#fff" : C.usu }}>{i + 1}</span>
                <span className="text-[12px]"
                  style={{ color: i <= step ? C.sumi : C.usu, fontWeight: i === step ? 800 : 400 }}>{f}</span>
              </div>
            ))}
            <p className="text-[11px] mt-2 pt-2" style={{ color: C.usu, borderTop: `1px dashed ${C.keisen}` }}>
              相手の確認が取れるまで、遅延として記録されることはありません。
              信用情報に載るのは事実確認が終わったものだけです。
            </p>
          </DenpyoCard>

          {p.log.length > 0 && (
            <DenpyoCard>
              {p.log.map((l, i) => (
                <div key={i} className="flex gap-2 py-1">
                  <span className="text-[11px] flex-shrink-0" style={{ color: C.usu, fontFamily: MONO }}>{l.t}</span>
                  <span className="text-[12px]" style={{ color: C.sumi }}>{l.text}</span>
                </div>
              ))}
            </DenpyoCard>
          )}

          {p.status === "期日超過" && (
            <>
              <div className="p-2 mb-3 rounded-sm" style={{ background: C.kami, border: `1px solid ${C.keisen}` }}>
                <p className="text-[12px]" style={{ color: C.usu }}>
                  行き違いの可能性があるため、まず相手に確認を依頼します。この時点では記録は残りません。
                </p>
              </div>
              <Btn tone="ki" onClick={() => {
                setPay({ status: "確認中" }, `${p.partner} に入金の確認を依頼しました（回答期限7日）`);
                say("確認を依頼しました");
              }}>相手に入金の確認を依頼する</Btn>
              <div className="mt-2">
                <Btn tone="midori" onClick={() => {
                  setPay({ status: "解決（記録なし）" }, "入金を確認しました");
                  say("入金を確認しました");
                }}>入金を確認できた</Btn>
              </div>
            </>
          )}

          {p.status === "確認中" && (
            <>
              <p className="text-[12px] mb-3 text-center" style={{ color: C.usu }}>
                相手の回答を待っています（回答期限まで7日）
              </p>
              <Btn tone="midori" onClick={() => {
                setPay({ status: "解決（記録なし）" }, "入金を確認しました"); say("入金を確認しました");
              }}>入金を確認できた</Btn>
              <div className="mt-2">
                <Btn onClick={() => setPay({ status: "支払予定日の申告あり" },
                  `${p.partner} から支払予定日の回答がありました`)}>（デモ）相手が支払予定日を回答</Btn>
              </div>
              <div className="mt-2">
                <Btn tone="sumi" onClick={() => setPay({ status: "異議あり" },
                  `${p.partner} から出来高に相違があると異議が出ました`)}>（デモ）相手が異議を申し立てる</Btn>
              </div>
            </>
          )}

          {p.status === "支払予定日の申告あり" && (
            <>
              <div className="p-2 mb-3 rounded-sm" style={{ background: C.kami, border: `1px solid ${C.ki}` }}>
                <p className="text-[12px]" style={{ color: C.sumi }}>
                  相手から支払予定日の回答がありました。承諾すると、その日まで遅延にはなりません。
                </p>
              </div>
              <Btn tone="midori" onClick={() => {
                setPay({ status: "解決（記録なし）" }, "支払予定日を承諾しました"); say("承諾しました");
              }}>この予定日で承諾する</Btn>
              <div className="mt-2">
                <Btn tone="aka" onClick={() => setPay({ status: "運営が事実確認中" },
                  "承諾せず、運営に事実確認を依頼しました")}>承諾できない（運営に確認を依頼）</Btn>
              </div>
            </>
          )}

          {p.status === "異議あり" && (
            <>
              <div className="p-2 mb-3 rounded-sm" style={{ background: C.kami, border: `1px solid ${C.aka}` }}>
                <p className="text-[12px]" style={{ color: C.sumi }}>
                  相手から異議が出ています。注文書・請求書・やり取りの記録をもとに運営が事実確認します。
                  結論が出るまで、どちらの信用情報にも反映されません。
                </p>
              </div>
              <Btn tone="aka" onClick={() => {
                setPay({ status: "運営が事実確認中" }, "運営に事実確認を依頼しました");
                say("運営に確認を依頼しました");
              }}>運営に事実確認を依頼する</Btn>
            </>
          )}

          {p.status === "運営が事実確認中" && (
            <>
              <p className="text-[12px] mb-3 text-center" style={{ color: C.usu }}>
                運営が確認しています。注文書・請求書・メッセージの記録を照合します。
              </p>
              <Btn tone="midori" onClick={() => setPay({ status: "解決（記録なし）" },
                "運営の確認により、遅延にあたらないと判断されました")}>（デモ）遅延にあたらないと判断</Btn>
              <div className="mt-2">
                <Btn tone="aka" onClick={() => setPay({ status: "遅延として記録" },
                  "運営の確認により、遅延として記録されました")}>（デモ）遅延として確定</Btn>
              </div>
            </>
          )}

          {(p.status === "解決（記録なし）" || p.status === "遅延として記録") && (
            <div className="p-3 rounded-sm"
              style={{ background: p.status === "遅延として記録" ? C.aka : C.midori }}>
              <p className="text-[13px] font-extrabold mb-1" style={{ color: "#fff" }}>
                {p.status === "遅延として記録" ? "遅延として記録されました" : "解決しました（記録は残りません）"}
              </p>
              <p className="text-[12px]" style={{ color: "rgba(255,255,255,.9)" }}>
                {p.status === "遅延として記録"
                  ? "双方の確認と運営の事実確認を経て確定した記録です。異議がある場合は運営に再審査を申請できます。"
                  : "確認が取れたため、信用情報には何も反映されません。"}
              </p>
            </div>
          )}
        </div>
      </>
    );
  };

  /* ── 今日やること（発注・受注どちらの立場でも） ── */
  const todoList = () => {
    const t = [];
    txs.forEach((tx) => {
      const uke = tx.role === "uke";
      tx.orders.filter((o) => !o.ukesho).forEach((o) => {
        if (uke) t.push({ k: `o${o.id}`, tone: TONE.action,
          label: `注文請書の返送`, sub: `${tx.partner}・注文書No.${o.no}`, tx });
      });
      (tx.requests || []).filter((r) => r.status === "依頼中").forEach((r) => {
        if (!uke) t.push({ k: `r${r.id}`, tone: TONE.action,
          label: "追加工事の注文書を出す", sub: `${tx.partner}・${r.naiyou}`, tx });
      });
      tx.invoices.forEach((v) => {
        if (!uke && v.state === "提出済") t.push({ k: `i${v.id}`, tone: TONE.action,
          label: "請求の承認", sub: `${tx.partner}・${money(v.gaku)}`, tx });
        if (!uke && v.state === "承認済") t.push({ k: `p${v.id}`, tone: TONE.action,
          label: "支払の登録", sub: `${tx.partner}・期日${fmt(v.due)}`, tx });
        if (uke && v.state === "支払済") t.push({ k: `c${v.id}`, tone: TONE.done,
          label: "入金の確認", sub: `${tx.partner}・${money(v.gaku)}`, tx });
        if (uke && overdue(v) && v.state !== "入金済") t.push({ k: `d${v.id}`, tone: TONE.action,
          label: "入金がない（確認を依頼）", sub: `${tx.partner}・期日${fmt(v.due)}`, tx });
      });
      if (tx.status === "完了申請中" && !uke) t.push({ k: `k${tx.id}`, tone: TONE.active,
        label: "取引完了の承認", sub: tx.partner, tx });
      if (uke && tx.status === "進行中" && tx.reports.length === 0) t.push({ k: `n${tx.id}`, tone: TONE.active,
        label: "日報がまだありません", sub: tx.kouji, tx });
    });
    return t;
  };

  const payPlan = () => {
    const m = {};
    txs.filter((x) => x.role === "moto").forEach((tx) =>
      tx.invoices.filter((v) => v.state === "承認済" || v.state === "支払済").forEach((v) => {
        (m[v.due] = m[v.due] || []).push({ ...v, partner: tx.partner, kouji: tx.kouji });
      }));
    return Object.entries(m).sort();
  };

  /* ── 取引タブ ── */
  const Docs = () => (
    <>
      <Header title="取引" />
      <div className="flex" style={{ background: C.sumi }}>
        {[["tx", "取引"], ["pay", "支払予定"], ["out", "アプリ外の書類"]].map(([k, l]) => (
          <button key={k} onClick={() => setDocTab(k)} className="flex-1 py-2 text-[12px] font-bold"
            style={{
              color: docTab === k ? C.sumi : "rgba(255,255,255,.6)",
              background: docTab === k ? C.ki : "transparent",
            }}>{l}</button>
        ))}
      </div>
      <div className="p-3">
        {docTab === "tx" && (
          <>
            {todoList().length > 0 && (
              <div className="mb-4 rounded-sm overflow-hidden" style={{ border: `2px solid ${C.sumi}` }}>
                <div className="flex items-center gap-2 px-3 py-2" style={{ background: C.sumi }}>
                  <span className="text-[13px] font-extrabold" style={{ color: C.ki }}>今日やること</span>
                  <span className="text-[11px] font-bold px-1.5 py-[2px] rounded-sm"
                    style={{ background: C.ki, color: C.sumi }}>{todoList().length}件</span>
                </div>
                <div style={{ background: C.kami }}>
                  {todoList().map((t, i) => (
                    <button key={t.k} onClick={() => setTxOpen(t.tx)}
                      className="flex items-center gap-2 w-full text-left px-3 py-2.5"
                      style={{ borderTop: i > 0 ? `1px solid ${C.keisen}` : "none" }}>
                      <span className="rounded-sm flex-shrink-0" style={{ width: 6, height: 34, background: C[t.tone] }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-extrabold" style={{ color: C.sumi }}>{t.label}</div>
                        <div className="text-[11px] truncate" style={{ color: C.usu }}>{t.sub}</div>
                      </div>
                      <ChevronRight size={16} style={{ color: C.usu }} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-start gap-2 p-2 mb-3 rounded-sm"
              style={{ background: C.kami, border: `1px solid ${C.midori}` }}>
              <Check size={16} style={{ color: C.midori, marginTop: 1, flexShrink: 0 }} />
              <p className="text-[12px]" style={{ color: C.sumi }}>
                注文書から入金までを1本の取引として扱います。進捗は作業日報で共有し、
                <strong>受け取りと請書の返送は無料</strong>です。
              </p>
            </div>
            <div className="p-2 mb-3 rounded-sm" style={{ background: C.kami, border: `1px solid ${C.keisen}` }}>
              <p className="text-[12px]" style={{ color: C.usu }}>
                取引はメッセージの中から依頼します。案件のやり取りからでも、
                会社一覧から直接送ったやり取りからでも始められます。
              </p>
            </div>
            <Legend open={legend} onClick={() => setLegend(!legend)} items={[
              [C.aka, "あなたの対応待ち"],
              [C.ki, "進行中"],
              [C.midori, "完了・良好"],
              [C.usu, "終了・停止"],
            ]} />
            {txs.map((tx) => {
              const nx = txNext(tx);
              const billed = invBilled(tx);
              return (
                <button key={tx.id} onClick={() => setTxOpen(tx)} className="block w-full text-left">
                  <DenpyoCard tone={tx.orders.some((o) => !o.ukesho) ? "aka"
                    : tx.status === "完了" ? "midori" : "ki"}>
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <Chip solid color={tx.role === "uke" ? C.sumi : C.usu}>
                        {tx.role === "uke" ? "受注" : "発注"}
                      </Chip>
                      <Chip color={tx.status === "完了" ? C.midori : C.sumi}>{tx.status}</Chip>
                      {(tx.requests || []).some((r) => r.status === "依頼中") &&
                        <Chip color={C.aka}>追加工事の依頼あり</Chip>}
                      {invOntime(tx) > 0 && <Chip color={C.midori}>期日内 {invOntime(tx)}回</Chip>}
                      <span className="flex-1" />
                      <ChevronRight size={16} style={{ color: C.usu }} />
                    </div>
                    <div className="text-[15px] font-extrabold mb-[2px]" style={{ color: C.sumi }}>{tx.kouji}</div>
                    <div className="text-[12px] mb-1.5" style={{ color: C.usu }}>{tx.partner}</div>
                    <Row icon={FileText} label="注文書" value={`${tx.orders.length}枚`} mono />
                    {txTotal(tx) > 0 && <Row icon={Banknote} label="注文合計" value={money(txTotal(tx))} mono />}
                    <Row label="請求済" value={txTotal(tx) > 0
                      ? `${money(billed)}／残り ${money(Math.max(0, txTotal(tx) - billed))}` : money(billed)} mono />
                    {tx.reports.length > 0 && (
                      <Row label="日報" value={`${tx.reports.length}日ぶん`} mono />
                    )}
                    <div className="mt-2 text-[12px] font-extrabold" style={{ color: nx.tone }}>
                      次にやること：{nx.label}
                    </div>
                  </DenpyoCard>
                </button>
              );
            })}
          </>
        )}

        {docTab === "pay" && (
          <>
            <div className="flex items-start gap-2 p-2 mb-3 rounded-sm"
              style={{ background: C.kami, border: `1px solid ${C.keisen}` }}>
              <Banknote size={16} style={{ color: C.usu, marginTop: 1, flexShrink: 0 }} />
              <p className="text-[12px]" style={{ color: C.sumi }}>
                承認済み・支払登録済みの請求を、支払日ごとにまとめています。
                振込データの作成にそのまま使えます。
              </p>
            </div>
            {!R.amount ? (
              <div className="py-10 text-center">
                <Lock size={28} style={{ color: C.keisen, margin: "0 auto 8px" }} />
                <p className="text-[13px]" style={{ color: C.usu }}>
                  現場担当のロールでは金額を表示しません。
                </p>
              </div>
            ) : payPlan().length === 0 ? (
              <p className="text-[13px] py-10 text-center" style={{ color: C.usu }}>
                支払予定はありません。
              </p>
            ) : (
              <>
                {payPlan().map(([due, list]) => {
                  const sum = list.reduce((n, v) => n + v.gaku, 0);
                  const soon = due <= todayISO();
                  return (
                    <DenpyoCard key={due} tone={soon ? TONE.action : TONE.active}>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-[16px] font-extrabold" style={{ color: C.sumi, fontFamily: MONO }}>
                          {fmt(due)}
                        </span>
                        <span className="text-[11px]" style={{ color: C.usu }}>支払日</span>
                        <span className="flex-1" />
                        <span className="text-[17px] font-extrabold" style={{ color: C.sumi, fontFamily: MONO }}>
                          {yen(sum)}
                        </span>
                      </div>
                      {list.map((v) => (
                        <div key={v.id} className="flex items-center gap-2 py-[3px]"
                          style={{ borderTop: `1px dashed ${C.keisen}` }}>
                          <span className="text-[12px] flex-1 truncate" style={{ color: C.sumi }}>
                            {v.partner}
                          </span>
                          <Chip color={v.state === "支払済" ? C.midori : C.usu}>{v.state}</Chip>
                          <span className="text-[13px] font-bold" style={{ color: C.sumi, fontFamily: MONO }}>
                            {yen(v.gaku)}
                          </span>
                        </div>
                      ))}
                    </DenpyoCard>
                  );
                })}
                <DenpyoCard tone={TONE.done}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-extrabold" style={{ color: C.sumi }}>合計</span>
                    <span className="flex-1" />
                    <span className="text-[19px] font-extrabold" style={{ color: C.sumi, fontFamily: MONO }}>
                      {yen(payPlan().reduce((n, [, l]) => n + l.reduce((m, v) => m + v.gaku, 0), 0))}
                    </span>
                  </div>
                </DenpyoCard>
                <Btn onClick={() => say("CSVを書き出しました（振込データに使えます）")}>
                  <span className="inline-flex items-center gap-1.5"><FileText size={15} />CSVで書き出す</span>
                </Btn>
              </>
            )}
          </>
        )}

        {docTab === "out" && (
          <>
            <div className="flex items-start gap-2 p-2 mb-3 rounded-sm"
              style={{ background: C.kami, border: `1px solid ${C.keisen}` }}>
              <FileText size={16} style={{ color: C.usu, marginTop: 1, flexShrink: 0 }} />
              <p className="text-[12px]" style={{ color: C.sumi }}>
                このアプリを使っていない取引先向けに、書類だけを単独でつくれます。
                取引の記録には残りません。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[["estimate", "見積書"], ["order", "注文書"], ["invoice", "請求書"]].map(([k, l]) => (
                <button key={k} onClick={() => canIssue ? (setComposeJob(null), setCompose(k)) : goPlan()}
                  className="py-3 rounded-sm text-[13px] font-extrabold flex items-center justify-center gap-1"
                  style={{ background: canIssue ? C.sumi : C.keisen, color: canIssue ? "#fff" : C.usu }}>
                  {canIssue ? <Plus size={14} /> : <Lock size={13} />}{l}
                </button>
              ))}
            </div>
            {!L.docs && (
              <p className="text-[12px] mb-3 text-center" style={{ color: C.usu }}>
                発行はスタンダード以上の機能です。
              </p>
            )}
            {issued.length === 0
              ? <p className="text-[13px] py-6 text-center" style={{ color: C.usu }}>
                  まだ発行した書類はありません。
                </p>
              : issued.map((d) => (
                <DenpyoCard key={d.id} tone={d.kind === "見積書" ? "midori" : "ki"}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Chip solid color={d.kind === "見積書" ? C.midori : C.sumi}>{d.kind}</Chip>
                    {d.via && <Chip color={C.usu}>メッセージから</Chip>}
                    <span className="flex-1" />
                    <Chip color={C.midori}>送信済</Chip>
                  </div>
                  <div className="text-[15px] font-extrabold mb-1" style={{ color: C.sumi }}>{d.kouji}</div>
                  <Row icon={Building2} label="宛先" value={d.aite} />
                  <Row icon={Banknote} label="金額" value={yen(d.gaku)} mono />
                </DenpyoCard>
              ))}

            <div className="flex items-center gap-2 mb-2 mt-5">
              <h2 className="text-[13px] font-extrabold" style={{ color: C.sumi }}>取引先</h2>
              <span className="text-[12px]" style={{ color: C.usu, fontFamily: MONO }}>{partners.length}社</span>
            </div>
            <button onClick={() => setPartnerNew(true)}
              className="w-full mb-3 py-2.5 rounded-sm text-[13px] font-extrabold flex items-center justify-center gap-1.5"
              style={{ background: C.kami, color: C.sumi, border: `1px solid ${C.sumi}` }}>
              <Plus size={15} />取引先を登録する（招待も送れます）
            </button>
            {partners.map((pt) => (
              <DenpyoCard key={pt.id} tone={pt.inapp ? "midori" : "plain"}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[15px] font-extrabold" style={{ color: C.sumi }}>{pt.name}</span>
                  <span className="flex-1" />
                  {pt.inapp ? <Chip color={C.midori}>アプリ内</Chip> : <Chip color={C.usu}>アプリ外</Chip>}
                </div>
                <Row label="担当" value={pt.tanto || "—"} />
                <Row label="締め日" value={pt.shime} mono />
                <Row label="支払日" value={pt.shiharai} mono />
                {!pt.inapp && pt.renraku && (
                  <div className="mt-2">
                    <Btn onClick={() => say(`${pt.name} に招待を送りました`)}>
                      <span className="inline-flex items-center gap-1.5"><Send size={14} />このアプリに招待する</span>
                    </Btn>
                  </div>
                )}
              </DenpyoCard>
            ))}
          </>
        )}
      </div>
    </>
  );

  /* ── 書類作成 ── */
  const KIND = { estimate: "見積書", order: "注文書", invoice: "請求書" };
  const Compose = ({ kind }) => {
    const name = KIND[kind];
    const gakuLabel = kind === "order" ? "請負代金（税抜）"
      : kind === "estimate" ? "見積金額（税抜）" : "請求金額（税抜）";
    return (
      <>
        <Header title={`${name}をつくる`} back={() => { setCompose(null); setComposeJob(null); }} />
        <div className="p-3">
          <div className="p-2 mb-3 rounded-sm" style={{ background: C.kami, border: `1px solid ${C.keisen}` }}>
            <p className="text-[12px]" style={{ color: C.usu }}>
              {composeJob
                ? `${composeJob.name} のやり取りに添付して送ります。発行済にも残ります。`
                : "アプリ内で受注した案件だけでなく、普段の取引先にもそのまま発行できます。"}
            </p>
          </div>
          <label className="block mb-3">
            <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>宛先（登録した取引先）</span>
            <select value={form.aite} onChange={(e) => setForm({ ...form, aite: e.target.value })}
              className="w-full px-3 py-2 text-[15px] outline-none"
              style={{ background: C.kami, border: `1px solid ${C.keisen}`, borderRadius: 4, color: C.sumi }}>
              <option value="">選択してください</option>
              {partners.map((pt) => (
                <option key={pt.id} value={pt.name}>
                  {pt.name}{pt.tanto && `（${pt.tanto}）`}{pt.inapp ? "・アプリ内" : ""}
                </option>
              ))}
            </select>
            <button onClick={() => { setCompose(null); setTab("docs"); setDocTab("out"); setPartnerNew(true); }}
              className="text-[12px] font-bold underline mt-1" style={{ color: C.usu }}>
              取引先を登録する
            </button>
          </label>
          <Field label="工事名" value={form.kouji} onChange={(v) => setForm({ ...form, kouji: v })}
            placeholder="千住 戸建外壁塗装" />
          <Field label="工事場所" value={form.basho} onChange={(v) => setForm({ ...form, basho: v })}
            placeholder="足立区千住3-14-2" />
          <Field label="工期" value={form.koki} onChange={(v) => setForm({ ...form, koki: v })}
            placeholder="9/8〜9/30" />
          <Field label={gakuLabel} type="number" value={form.gaku}
            onChange={(v) => setForm({ ...form, gaku: v })} placeholder="1120000" />
          {form.gaku && (
            <DenpyoCard tone="ki">
              <Row label="小計" value={yen(form.gaku)} mono />
              <Row label="消費税" value={yen(Math.floor(Number(form.gaku) * 0.1))} mono />
              <Row label="合計" value={yen(Math.floor(Number(form.gaku) * 1.1))} mono />
            </DenpyoCard>
          )}
          <Btn tone="ki" disabled={!form.aite || !form.kouji || !form.gaku}
            onClick={() => setConfirm({
              title: `この内容で${name}を送りますか`,
              note: "送信すると相手に届きます。",
              rows: [
                ["宛先", form.aite], ["工事名", form.kouji],
                ["小計", yen(form.gaku)],
                ["消費税", yen(Math.floor(Number(form.gaku) * 0.1))],
                ["合計", yen(Math.floor(Number(form.gaku) * 1.1))],
              ],
              okLabel: "この内容で送信する",
              onOk: () => {
              const fileName = `${name}_${form.kouji}.pdf`;
              setIssued((p) => [{
                ...form, id: Date.now(), kind: name, gaku: Number(form.gaku),
                via: composeJob ? composeJob.name : null,
              }, ...p]);
              if (composeJob) {
                postMsg(composeJob.id, { me: true, file: { name: fileName, type: name, gaku: Number(form.gaku) } });
                setMsgJob(convOf(composeJob.id)); setComposeJob(null);
              } else { setDocTab("out"); }
              setForm({ aite: "", kouji: "", basho: "", koki: "", gaku: "" });
              setCompose(null); setConfirm(null); say(`${name}を送信しました`);
              },
            })}>
            <span className="inline-flex items-center gap-1.5"><Send size={15} />内容を確認して送信する</span>
          </Btn>
          <p className="text-[11px] mt-2 text-center" style={{ color: C.usu }}>
            {kind === "estimate"
              ? "見積書は送信後も作り直せます（注文書・請求書は編集できません）"
              : "送信後は編集できません（原本性の確保）"}
          </p>
        </div>
      </>
    );
  };

  /* ── 工事写真：現場フォルダ ＞ 工種フォルダ ＞ 工程 ── */
  const sitePhotos = (sid) => photos.filter((p) => p.siteId === sid);
  const savePhoto = (url) => {
    setPhotos((p) => [{ id: Date.now(), url, siteId: siteOpen.id, ...bb }, ...p]);
    say(`${bb.koushu}／${bb.koutei} に保存しました`);
  };

  const jusyu = inbox.filter((o) => o.uke);
  const SiteNew = () => (
    <>
      <Header title="現場をつくる" back={() => setSiteNew(false)} />
      <div className="p-3">
        <div className="p-2 mb-3 rounded-sm" style={{ background: C.kami, border: `1px solid ${C.keisen}` }}>
          <p className="text-[12px]" style={{ color: C.usu }}>
            現場フォルダは同時に{lim(L.site)}件まで作れます。
            {L.site !== INF && "終わった現場を削除すると、新しい現場を作れます。"}
          </p>
        </div>
        {jusyu.length > 0 && (
          <div className="mb-4">
            <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
              受注中の現場から選ぶ
            </span>
            {jusyu.map((o) => {
              const made = sites.some((x) => x.name === o.kouji);
              return (
                <button key={o.id} disabled={made}
                  onClick={() => setSForm({ name: o.kouji, place: o.basho })}
                  className="w-full text-left p-2.5 mb-2 rounded-sm disabled:opacity-45"
                  style={{
                    background: sForm.name === o.kouji ? C.ki : C.kami,
                    border: `1px solid ${sForm.name === o.kouji ? C.ki : C.keisen}`,
                  }}>
                  <div className="flex items-center gap-2">
                    <HardHat size={17} style={{ color: C.sumi, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-extrabold truncate" style={{ color: C.sumi }}>
                        {o.kouji}
                      </div>
                      <div className="text-[11px] truncate" style={{ color: C.usu }}>
                        {o.from}・{o.koki}
                      </div>
                    </div>
                    {made ? <Chip color={C.usu}>作成済</Chip>
                          : sForm.name === o.kouji && <Check size={17} style={{ color: C.sumi }} />}
                  </div>
                </button>
              );
            })}
            <div className="text-[11px] mt-2 mb-1" style={{ color: C.usu }}>
              受注していない現場は、下に直接入力してください。
            </div>
          </div>
        )}

        <Field label="現場名（黒板の工事名になります）" value={sForm.name}
          onChange={(v) => setSForm({ ...sForm, name: v })} placeholder="五井中央 共同住宅" />
        <Field label="住所" value={sForm.place} onChange={(v) => setSForm({ ...sForm, place: v })}
          placeholder="市原市五井中央西2-1-8" />
        <Btn tone="ki" disabled={!sForm.name}
          onClick={() => {
            const s = { id: Date.now(), ...sForm };
            setSites((p) => [...p, s]);
            setSForm({ name: "", place: "" });
            setSiteNew(false); setSiteOpen(s); setBb((b) => ({ ...b, kouji: s.name }));
            say("現場をつくりました");
          }}>この現場をつくる</Btn>
      </div>
    </>
  );

  const SiteList = () => (
    <>
      <Header title="工事写真" />
      <div className="p-3">
        <div className="p-2 mb-3 rounded-sm" style={{ background: C.kami, border: `1px solid ${C.keisen}` }}>
          <p className="text-[12px]" style={{ color: C.usu }}>
            撮影と黒板は無料で使えます。民間工事向けで、公共工事の電子納品には未対応です。
          </p>
        </div>

        {sites.length === 0 ? (
          <div className="py-10 text-center">
            <HardHat size={40} style={{ color: C.keisen, margin: "0 auto 12px" }} />
            <p className="text-[14px] font-bold mb-1" style={{ color: C.sumi }}>現場がまだありません</p>
            <p className="text-[12px] mb-5" style={{ color: C.usu }}>
              先に現場をつくると、写真がその中に整理されます。
              {jusyu.length > 0 && `受注中の現場が${jusyu.length}件あるので、そこから選べます。`}
            </p>
            <Btn tone="ki" onClick={() => setSiteNew(true)}>現場をつくる</Btn>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-[13px] font-extrabold" style={{ color: C.sumi }}>現場フォルダ</h2>
              <span className="text-[12px]" style={{ color: C.usu, fontFamily: MONO }}>
                {sites.length}／{lim(L.site)}
              </span>
            </div>
            {sites.map((s) => {
              const ps = sitePhotos(s.id);
              return (
                <DenpyoCard key={s.id} tone="ki">
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setSiteOpen(s); setBb((b) => ({ ...b, kouji: s.name })); }}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left">
                      <Folder size={18} style={{ color: C.sumi, flexShrink: 0 }} />
                      <div className="min-w-0">
                        <div className="text-[15px] font-extrabold truncate" style={{ color: C.sumi }}>{s.name}</div>
                        <div className="text-[11px] truncate" style={{ color: C.usu }}>
                          {s.place || "住所なし"}・{ps.length}枚
                        </div>
                      </div>
                    </button>
                    <button onClick={() => {
                      setSites((p) => p.filter((x) => x.id !== s.id));
                      setPhotos((p) => p.filter((x) => x.siteId !== s.id));
                      say("現場を削除しました");
                    }} className="p-2" aria-label="現場を削除">
                      <Trash2 size={17} style={{ color: C.aka }} />
                    </button>
                    <ChevronRight size={17} style={{ color: C.usu }} />
                  </div>
                </DenpyoCard>
              );
            })}
            {canSite ? (
              <button onClick={() => setSiteNew(true)}
                className="w-full py-2.5 rounded-sm text-[13px] font-extrabold flex items-center justify-center gap-1.5"
                style={{ background: C.kami, color: C.sumi, border: `1px solid ${C.sumi}` }}>
                <Plus size={15} />現場を追加する
              </button>
            ) : (
              <div className="p-3 rounded-sm" style={{ background: C.ki }}>
                <p className="text-[13px] font-extrabold mb-1" style={{ color: C.sumi }}>
                  同時に持てる現場は{L.site}件までです
                </p>
                <p className="text-[12px] mb-3" style={{ color: C.sumi }}>
                  終わった現場を削除すれば新しく作れます。プロプランなら制限はありません。
                </p>
                <Btn onClick={goPlan}>プランを見る</Btn>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );

  const SiteDetail = ({ s }) => {
    const ps = sitePhotos(s.id);
    const byK = ps.reduce((a, p) => { (a[p.koushu] = a[p.koushu] || []).push(p); return a; }, {});
    return (
      <>
        <Header title={s.name} back={() => setSiteOpen(null)} right={
          <span className="text-[12px] font-bold" style={{ color: C.ki, fontFamily: MONO }}>{ps.length}枚</span>
        } />
        <div className="p-3">
          <div className="mb-3">
            <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
              工種（この中がフォルダになります）
            </span>
            <div className="mb-2"><Pills options={KOUSHU_YOKU} value={bb.koushu}
              onChange={(v) => setBb({ ...bb, koushu: v })} /></div>
            <input value={bb.koushu} onChange={(e) => setBb({ ...bb, koushu: e.target.value })}
              className="w-full px-3 py-2 text-[15px] outline-none"
              style={{ background: C.kami, border: `1px solid ${C.keisen}`, borderRadius: 4, color: C.sumi }} />
          </div>

          <div className="mb-3">
            <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>作業工程</span>
            <div className="grid grid-cols-4 gap-1">
              {KOUTEI.map((k) => (
                <button key={k} onClick={() => setBb({ ...bb, koutei: k })}
                  className="py-2 text-[12px] font-extrabold rounded-sm"
                  style={{
                    background: bb.koutei === k ? C.ki : C.kami, color: C.sumi,
                    border: `1px solid ${bb.koutei === k ? C.ki : C.keisen}`,
                  }}>{k}</button>
              ))}
            </div>
          </div>

          <Field label="撮影箇所" value={bb.basho} onChange={(v) => setBb({ ...bb, basho: v })}
            placeholder="北面 全景" />

          <div className="grid grid-cols-2 gap-2 mb-3">
            <button onClick={() => setCam(true)}
              className="py-3 rounded-sm text-[13px] font-extrabold flex items-center justify-center gap-1.5"
              style={{ background: C.sumi, color: "#fff" }}>
              <Camera size={16} />カメラを起動
            </button>
            <label className="py-3 rounded-sm text-[13px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
              style={{ background: C.kami, color: C.sumi, border: `1px solid ${C.keisen}` }}>
              写真を選ぶ
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]; if (f) burnFile(f, bb, savePhoto);
              }} />
            </label>
          </div>

          <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>仕上がり見本</span>
          <BoardPreview b={bb} />

          <div className="mt-6">
            <h2 className="text-[13px] font-extrabold mb-2" style={{ color: C.sumi }}>工種フォルダ</h2>
            {ps.length === 0
              ? <p className="text-[13px] py-6 text-center" style={{ color: C.usu }}>
                  撮影すると、工種ごとのフォルダに自動でしまわれます。
                </p>
              : Object.keys(byK).map((k) => {
                  const g = byK[k];
                  return (
                    <button key={k} onClick={() => setKoushuOpen(k)} className="block w-full text-left">
                      <DenpyoCard>
                        <div className="flex items-center gap-2">
                          <Folder size={18} style={{ color: C.sumi, flexShrink: 0 }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[15px] font-extrabold" style={{ color: C.sumi }}>{k}</div>
                            <div className="text-[11px] truncate" style={{ color: C.usu }}>
                              {KOUTEI.filter((x) => g.some((p) => p.koutei === x)).join("・")}
                            </div>
                          </div>
                          <span className="text-[13px] font-bold" style={{ color: C.usu, fontFamily: MONO }}>
                            {g.length}
                          </span>
                          <ChevronRight size={17} style={{ color: C.usu }} />
                        </div>
                      </DenpyoCard>
                    </button>
                  );
                })}
          </div>
        </div>
      </>
    );
  };

  const KoushuView = ({ s, name }) => {
    const list = sitePhotos(s.id).filter((p) => p.koushu === name);
    return (
      <>
        <Header title={`${s.name}／${name}`} back={() => setKoushuOpen(null)} right={
          <span className="text-[12px] font-bold" style={{ color: C.ki, fontFamily: MONO }}>{list.length}枚</span>
        } />
        <div className="p-3">
          {KOUTEI.map((k) => {
            const g = list.filter((p) => p.koutei === k);
            if (!g.length) return null;
            return (
              <div key={k} className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <Chip solid color={C.sumi}>{k}</Chip>
                  <span className="text-[12px]" style={{ color: C.usu, fontFamily: MONO }}>{g.length}枚</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {g.map((p) => (
                    <div key={p.id}>
                      <img src={p.url} alt={p.basho} className="w-full rounded-sm"
                        style={{ border: `1px solid ${C.keisen}` }} />
                      <div className="text-[11px] mt-1 truncate" style={{ color: C.usu }}>{p.basho || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <Btn onClick={() => say(`${name}のPDF台帳を書き出しました`)}>この工種のPDF台帳を書き出す</Btn>
        </div>
      </>
    );
  };

  /* ── 登録会社一覧 ── */
  const Firms = () => {
    const list = Object.keys(COMPANIES)
      .filter((n) => !cq || (n + COMPANIES[n].gyoshu + COMPANIES[n].area + COMPANIES[n].rep).includes(cq))
      .filter((n) => !coFavOnly || isFavCo(n))
      .filter((n) => !coTxOnly || txs.some((x) => x.partner === n))
      .sort((a, b) => (isFavCo(b) ? 1 : 0) - (isFavCo(a) ? 1 : 0));
    return (
      <>
        <Header title="登録会社" right={
          <span className="text-[12px] font-bold" style={{ color: C.ki, fontFamily: MONO }}>
            {list.length}社
          </span>
        } />
        <div className="p-3" style={{ background: C.kami, borderBottom: `1px solid ${C.keisen}` }}>
          <div className="flex gap-2">
            <input value={cqInput} onChange={(e) => setCqInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setCq(cqInput)}
              placeholder="会社名・工種・地名・代表者"
              className="flex-1 px-3 py-2 text-[15px] outline-none"
              style={{ background: C.kami, border: `1px solid ${C.keisen}`, borderRadius: 4, color: C.sumi }} />
            <button onClick={() => setCq(cqInput)}
              className="px-4 rounded-sm flex items-center gap-1.5 text-[13px] font-extrabold"
              style={{ background: C.sumi, color: "#fff" }}>
              <Search size={15} />検索
            </button>
          </div>
          {cq && (
            <button onClick={() => { setCq(""); setCqInput(""); }}
              className="flex items-center gap-1 text-[12px] font-bold mt-2" style={{ color: C.aka }}>
              <X size={13} />「{cq}」の検索を解除
            </button>
          )}
          <div className="flex flex-wrap gap-3 mt-2">
            <button onClick={() => setCoFavOnly(!coFavOnly)}
              className="flex items-center gap-1.5 text-[12px] font-bold"
              style={{ color: coFavOnly ? C.sumi : C.usu }}>
              <Star size={15} style={{ color: coFavOnly ? C.ki : C.keisen }} fill={coFavOnly ? C.ki : "none"} />
              お気に入り（{favCos.length}）
            </button>
            <button onClick={() => setCoTxOnly(!coTxOnly)}
              className="flex items-center gap-1.5 text-[12px] font-bold"
              style={{ color: coTxOnly ? C.sumi : C.usu }}>
              <Briefcase size={15} style={{ color: coTxOnly ? C.sumi : C.keisen }} />
              取引したことがある会社だけ
            </button>
          </div>
        </div>
        <div className="p-3">
          <Legend open={legend} onClick={() => setLegend(!legend)} items={[
            [C.midori, "信用スコア60点以上（Gold・Platinum）"],
            [C.keisen, "60点未満"],
            [C.ki, "★＝お気に入り"],
          ]} />
          {list.length === 0 && (
            <p className="text-[13px] py-10 text-center" style={{ color: C.usu }}>
              条件に合う会社がありません。
            </p>
          )}
          {list.map((n) => {
            const c = COMPANIES[n];
            const score = docPt(c.docs) + Math.min(20, c.torihiki);
            const talking = !!threads[`c:${n}`];
            return (
              <DenpyoCard key={n} tone={score >= 60 ? "midori" : "plain"}>
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <Chip solid color={C.midori}>{levelOf(score)}</Chip>
                  <Chip color={C.sumi}>{c.gyoshu}</Chip>
                  {talking && <Chip color={C.usu}>やり取り中</Chip>}
                  <span className="flex-1" />
                  <span className="text-[12px] font-extrabold" style={{ color: C.usu, fontFamily: MONO }}>
                    {score}点
                  </span>
                  <button onClick={() => toggleFavCo(n)} className="p-1 -mr-1" aria-label="お気に入り">
                    <Star size={18} style={{ color: isFavCo(n) ? C.ki : C.keisen }}
                      fill={isFavCo(n) ? C.ki : "none"} strokeWidth={2.2} />
                  </button>
                </div>
                <button onClick={() => setCompany(n)} className="flex items-center gap-1 mb-1">
                  <span className="text-[15px] font-extrabold underline" style={{ color: C.sumi }}>{n}</span>
                  <ChevronRight size={15} style={{ color: C.usu }} />
                </button>
                <Row icon={MapPin} label="所在地" value={c.area} />
                <Row icon={Building2} label="代表者" value={c.rep} />
                {txs.filter((x) => x.partner === n).length > 0 && (
                  <Row icon={Briefcase} label="自社との取引"
                    value={`${txs.filter((x) => x.partner === n).length}件`} mono />
                )}
                <div className="mt-2">
                  <Btn tone={talking ? "sumi" : "ki"}
                    onClick={() => { clearNav(); setTab("msgs"); openThread(coConv(n)); }}>
                    {talking ? "やり取りを開く" : "メッセージを送る"}
                  </Btn>
                </div>
              </DenpyoCard>
            );
          })}
          {plan !== "prem" && (
            <p className="text-[11px] text-center" style={{ color: C.usu }}>
              {L.name}でやり取りできるのは{lim(L.send)}件まで（今月あと {Math.max(0, L.send - usedMsg.length)}件）
            </p>
          )}
        </div>
      </>
    );
  };

  /* ── 自社 ── */
  const P = (k) => Object.values(PLANS).map((pl) => {
    const v = pl[k];
    return v === "pt" ? "PT" : v === INF ? "∞" : v === 0 ? "×" : String(v);
  });
  const PLAN_ROWS = [
    ["案件一覧・自社ページ", "∞", "∞", "∞", "∞"],
    ["工事写真・電子黒板", "∞", "∞", "∞", "∞"],
    ["受け取った書類・注文請書", "∞", "∞", "∞", "∞"],
    ["スカウト・見積依頼の受信", "∞", "∞", "∞", "∞"],
    ["スカウト・見積依頼の閲覧", ...P("recv")],
    ["案件詳細の閲覧（月）", ...P("detail")],
    ["やり取りできる案件（月）", ...P("send")],
    ["スカウトの送信（月）", ...P("scout")],
    ["案件の投稿（月）", ...P("post")],
    ["空き情報の掲載", ...P("aki")],
    ["同時に持てる現場フォルダ", ...P("site")],
    ["写真の保存容量（GB）", ...P("gb")],
    ["金額を扱える人数", ...P("users")],
    ["現場担当（日報・写真のみ）", "×", "∞", "∞", "∞"],
    ["見積書・注文書・請求書の発行", "×", "∞", "∞", "∞"],
    ["取引実績の詳細", "×", "概要", "詳細", "詳細"],
    ["運営の星評価", "×", "×", "○", "○"],
    ["ホームページ・SNS", "×", "×", "○", "○"],
    ["支払実績（遅延）", "×", "×", "×", "○"],
  ];

  /* ── 取引先の登録（招待も送れる） ── */
  const PartnerNew = () => (
    <>
      <Header title="取引先を登録する" back={() => setPartnerNew(false)} />
      <div className="p-3">
        <div className="p-2 mb-3 rounded-sm" style={{ background: C.kami, border: `1px solid ${C.keisen}` }}>
          <p className="text-[12px]" style={{ color: C.usu }}>
            アプリを使っていない取引先を登録すると、書類の宛先に選べるようになります。
            招待を送ると、相手が登録した時点でアプリ内の取引に切り替えられます。
          </p>
        </div>
        <Field label="会社名" value={ptForm.name} onChange={(v) => setPtForm({ ...ptForm, name: v })}
          placeholder="大久保工務店" />
        <Field label="担当者" value={ptForm.tanto} onChange={(v) => setPtForm({ ...ptForm, tanto: v })}
          placeholder="大久保" />
        <Field label="締め日" value={ptForm.shime} onChange={(v) => setPtForm({ ...ptForm, shime: v })}
          placeholder="末日" />
        <Field label="支払日" value={ptForm.shiharai} onChange={(v) => setPtForm({ ...ptForm, shiharai: v })}
          placeholder="翌月末" />
        <Field label="連絡先（メール・SMS）" value={ptForm.renraku}
          onChange={(v) => setPtForm({ ...ptForm, renraku: v })} placeholder="okubo@example.jp"
          hint="招待を送る場合は入力してください" />
        <button onClick={() => setPtForm({ ...ptForm, invite: !ptForm.invite })}
          className="flex items-start gap-2 w-full text-left p-3 mb-3 rounded-sm"
          style={{ background: ptForm.invite ? C.kami : C.yojo,
            border: `2px solid ${ptForm.invite ? C.midori : C.keisen}` }}>
          <span className="rounded-sm flex items-center justify-center flex-shrink-0"
            style={{ width: 20, height: 20, marginTop: 1,
              background: ptForm.invite ? C.midori : C.kami,
              border: `2px solid ${ptForm.invite ? C.midori : C.keisen}` }}>
            {ptForm.invite && <Check size={14} color="#fff" strokeWidth={3} />}
          </span>
          <span className="text-[13px]" style={{ color: C.sumi }}>
            <strong>このアプリへの招待も送る</strong>
            <span className="block text-[11px] mt-[2px]" style={{ color: C.usu }}>
              相手が登録すると、注文書や請求書をアプリ内でやり取りできます
            </span>
          </span>
        </button>
        <Btn tone="ki" disabled={!ptForm.name || (ptForm.invite && !ptForm.renraku)}
          onClick={() => setConfirm({
            title: ptForm.invite ? "登録して招待を送りますか" : "この内容で登録しますか",
            note: ptForm.invite ? "登録した連絡先に招待が届きます。" : "書類の宛先として使えるようになります。",
            rows: [
              ["会社名", ptForm.name], ["担当者", ptForm.tanto || "—"],
              ["締め／支払", `${ptForm.shime}／${ptForm.shiharai}`],
              ["招待", ptForm.invite ? `送る（${ptForm.renraku}）` : "送らない"],
            ],
            okLabel: ptForm.invite ? "登録して招待を送る" : "登録する",
            onOk: () => {
              setPartners((p) => [...p, { id: Date.now(), ...ptForm, inapp: false }]);
              say(ptForm.invite ? "登録し、招待を送りました" : "取引先を登録しました");
              setPtForm({ name: "", tanto: "", shime: "末日", shiharai: "翌月末", renraku: "", invite: true });
              setConfirm(null); setPartnerNew(false);
            },
          })}>{ptForm.invite ? "内容を確認して登録・招待する" : "内容を確認して登録する"}</Btn>
      </div>
    </>
  );

  /* ── プラン選択 ── */
  const PlansView = () => (
    <>
      <Header title="プラン" back={() => setPlansOpen(false)} />
      <div className="p-3">

        <div className="grid grid-cols-2 gap-2 mb-3">
          {Object.values(PLANS).map((pl) => {
            const on = plan === pl.key;
            return (
              <button key={pl.key} onClick={() => {
                setPlan(pl.key); say(`${pl.name}プランに切り替えました`);
              }} className="py-3 px-1 rounded-sm"
                style={{
                  background: on ? C.ki : C.kami, color: C.sumi,
                  border: `1px solid ${on ? C.ki : C.keisen}`,
                }}>
                <div className="text-[12px] font-extrabold">{pl.name}</div>
                <div className="text-[13px] font-extrabold" style={{ fontFamily: MONO }}>
                  {pl.price === 0 ? "¥0" : `¥${pl.price.toLocaleString("ja-JP")}`}
                </div>
                <div className="text-[9px]" style={{ color: C.usu }}>／月</div>
              </button>
            );
          })}
        </div>

        <DenpyoCard tone={plan === "free" ? "plain" : plan === "std" ? "ki" : "midori"}>
          <div className="flex text-[10px] font-bold pb-1 mb-1"
            style={{ color: C.usu, borderBottom: `1px solid ${C.keisen}` }}>
            <span className="flex-1" />
            {Object.values(PLANS).map((pl) => (
              <span key={pl.key} className="w-9 text-center"
                style={{ color: plan === pl.key ? C.sumi : C.usu }}>{pl.short}</span>
            ))}
          </div>
          {PLAN_ROWS.map(([label, ...cells], i) => (
            <div key={i} className="flex items-center py-[5px]"
              style={{ borderBottom: i < PLAN_ROWS.length - 1 ? `1px dashed ${C.keisen}` : "none" }}>
              <span className="flex-1 text-[11px] pr-1 leading-tight" style={{ color: C.sumi }}>{label}</span>
              {cells.map((v, k) => {
                const on = plan === Object.keys(PLANS)[k];
                return (
                  <span key={k} className="w-9 text-center text-[11px]"
                    style={{
                      color: v === "×" ? C.keisen : on ? C.sumi : C.usu,
                      fontWeight: on ? 800 : 700, fontFamily: MONO,
                    }}>{v}</span>
                );
              })}
            </div>
          ))}
          <p className="text-[10px] mt-2 leading-snug" style={{ color: C.usu }}>
            ∞＝無制限／PT＝閲覧ポイント制。スカウトは何件でも読めますが、返信するとやり取り枠を1件使います。
          </p>
        </DenpyoCard>

        {paid && (
          <>
            <h2 className="text-[13px] font-extrabold mb-2 mt-5" style={{ color: C.sumi }}>
              枠だけ買い足す
            </h2>
            <DenpyoCard tone={TONE.active}>
              <p className="text-[12px] mb-3" style={{ color: C.usu }}>
                プランを上げなくても、足りない枠だけ追加できます。当月内で使い切りです。
              </p>
              {[["スカウト送信 +10件", 2000], ["やり取り +5件", 2000], ["現場フォルダ +5件", 1000]].map(([l, y]) => (
                <div key={l} className="flex items-center gap-2 py-2"
                  style={{ borderTop: `1px dashed ${C.keisen}` }}>
                  <span className="flex-1 text-[13px]" style={{ color: C.sumi }}>{l}</span>
                  <span className="text-[13px] font-bold" style={{ color: C.usu, fontFamily: MONO }}>
                    {yen(y)}
                  </span>
                  <button onClick={() => say(`${l} を追加しました`)}
                    className="text-[12px] font-extrabold px-3 py-1.5 rounded-sm"
                    style={{ background: C.sumi, color: "#fff" }}>追加</button>
                </div>
              ))}
            </DenpyoCard>
          </>
        )}

        <DenpyoCard tone="plain">

          {plan !== "prem" && (
            <div className="mt-3 p-2 rounded-sm" style={{ background: C.yojo }}>
              <div className="text-[11px] font-bold mb-1" style={{ color: C.usu }}>今月の残り</div>
              <div className="text-[12px]" style={{ color: C.sumi, fontFamily: MONO }}>
                {L.detail !== INF && `詳細 ${Math.max(0, L.detail - usedDetail.length)}／${lim(L.detail)}・`}
                やり取り {Math.max(0, L.send - usedMsg.length)}／{lim(L.send)}・
                スカウト送信 {Math.max(0, L.scout - scoutSent.length)}／{lim(L.scout)}・
                {L.post !== INF && `投稿 ${Math.max(0, L.post - posted)}／${lim(L.post)}・`}
                現場 {sites.length}／{lim(L.site)}・
                空き情報 {myAki.length}／{lim(L.aki)}
              </div>
            </div>
          )}

          <button onClick={() => { setUsedDetail([]); setUsedMsg([]); setPosted(0); if (L.recv !== "pt") setViewedInv([]); say("今月分をリセットしました"); }}
            className="w-full mt-3 text-[12px] font-bold underline" style={{ color: C.usu }}>
            今月の使用回数をリセット（デモ・閲覧ポイントは戻りません）
          </button>
        </DenpyoCard>
      </div>
    </>
  );

  const Me = () => (
    <>
      <Header title="自社" />
      <div className="p-3">
        <DenpyoCard tone="ki">
          <div className="text-[17px] font-extrabold mb-1" style={{ color: C.sumi }}>高橋工業</div>
          <div className="flex gap-1.5 mb-2 flex-wrap">
            <Chip solid color={C.sumi}>足場</Chip>
            <Chip solid color={C.sumi}>解体</Chip>
            <Chip color={C.midori}>信用 {myLevel}</Chip>
            <span className="text-[12px] font-extrabold" style={{ color: C.usu, fontFamily: MONO }}>
              {myScore}点
            </span>
          </div>
          <Row label="対応地域" value="千葉県・東京都・埼玉県" />
          <Row label="許可番号" value="千葉県知事 般-4 第12345号" mono />
          <Row label="社会保険" value="健保・厚年・雇用 加入済" />
          <Row label="CCUS" value="登録あり" />
          {!paid && (
            <p className="text-[11px] mt-2 pt-2" style={{ color: C.usu, borderTop: `1px dashed ${C.keisen}` }}>
              無料プランのあいだは、相手の画面に「無料プランのユーザーです」と表示されます。
            </p>
          )}
        </DenpyoCard>

        <h2 className="text-[13px] font-extrabold mb-2 mt-5" style={{ color: C.sumi }}>信用スコア</h2>
        <DenpyoCard tone={myScore >= 60 ? "midori" : "ki"}>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[26px] font-extrabold" style={{ color: C.sumi, fontFamily: MONO }}>
              {myScore}
            </span>
            <span className="text-[12px]" style={{ color: C.usu }}>点</span>
            <span className="flex-1" />
            <Chip solid color={C.midori}>{myLevel}</Chip>
          </div>
          <div className="h-2 rounded-full mb-1" style={{ background: C.yojo }}>
            <div className="h-2 rounded-full"
              style={{ width: `${Math.min(100, myScore)}%`, background: C.midori }} />
          </div>
          <div className="flex text-[9px] mb-3" style={{ color: C.usu, fontFamily: MONO }}>
            <span className="flex-1">未認証</span><span className="flex-1 text-center">Bronze</span>
            <span className="flex-1 text-center">Silver</span><span className="flex-1 text-center">Gold</span>
            <span>Platinum</span>
          </div>
          <p className="text-[11px] mb-2" style={{ color: C.usu }}>
            会社の実在と体制が分かる書類を出すほどスコアが上がります。
            スコアは相手の画面にも表示され、スカウトの届きやすさに影響します。
          </p>
          {TRUST_DOCS.map((d) => {
            const has = myDocs.includes(d.id);
            return (
              <div key={d.id} className="flex items-center gap-2 py-2"
                style={{ borderTop: `1px dashed ${C.keisen}` }}>
                {has ? <Check size={16} style={{ color: C.midori, flexShrink: 0 }} />
                     : <span className="rounded-sm flex-shrink-0"
                         style={{ width: 15, height: 15, border: `2px solid ${C.keisen}` }} />}
                <span className="flex-1 text-[12px] leading-tight"
                  style={{ color: has ? C.usu : C.sumi }}>{d.label}</span>
                {has ? (
                  <span className="text-[11px] font-bold" style={{ color: C.midori, fontFamily: MONO }}>
                    +{d.pt} 提出済
                  </span>
                ) : (
                  <label className="text-[11px] font-extrabold px-2 py-1 rounded-sm cursor-pointer"
                    style={{ background: C.sumi, color: "#fff" }}>
                    +{d.pt} 提出
                    <input type="file" className="hidden" onChange={() => {
                      setMyDocs((p) => [...p, d.id]);
                      say(`${d.label}を提出しました（+${d.pt}点）`);
                    }} />
                  </label>
                )}
              </div>
            );
          })}
        </DenpyoCard>

        {L.recv === "pt" && (
          <>
            <h2 className="text-[13px] font-extrabold mb-2 mt-5" style={{ color: C.sumi }}>
              スカウト閲覧ポイント
            </h2>
            <DenpyoCard tone={invitePt > 0 ? "midori" : "usu"}>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[26px] font-extrabold" style={{ color: C.sumi, fontFamily: MONO }}>
                  {invitePt}
                </span>
                <span className="text-[12px]" style={{ color: C.usu }}>ポイント</span>
              </div>
              <p className="text-[11px] mb-3" style={{ color: C.usu }}>
                スカウト・見積依頼を1件読むごとに1ポイント使います。
                毎月のリセットはなく、使い切ったら戻りません。
              </p>
              {PROFILE_TASKS.map((t) => {
                const done = tasksDone.includes(t.id);
                return (
                  <button key={t.id} onClick={() => doTask(t)} disabled={done}
                    className="flex items-center gap-2 w-full text-left py-2"
                    style={{ borderTop: `1px dashed ${C.keisen}` }}>
                    {done
                      ? <Check size={16} style={{ color: C.midori, flexShrink: 0 }} />
                      : <span className="rounded-sm flex-shrink-0"
                          style={{ width: 15, height: 15, border: `2px solid ${C.keisen}` }} />}
                    <span className="flex-1 text-[13px]" style={{ color: done ? C.usu : C.sumi }}>
                      {t.label}
                    </span>
                    <span className="text-[12px] font-extrabold"
                      style={{ color: done ? C.usu : C.midori, fontFamily: MONO }}>
                      {done ? "取得済" : `+${t.pt}`}
                    </span>
                  </button>
                );
              })}
              <p className="text-[11px] mt-2" style={{ color: C.usu }}>
                プロフィールが埋まるほど、元請からのスカウトも届きやすくなります。
              </p>
            </DenpyoCard>
          </>
        )}

        <h2 className="text-[13px] font-extrabold mb-2 mt-5" style={{ color: C.sumi }}>立場</h2>
        <DenpyoCard tone={TONE.active}>
          <p className="text-[12px] mb-2" style={{ color: C.usu }}>
            選んだ立場に合わせて、最初に出る画面が変わります。
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[["uke", "受ける側"], ["moto", "出す側"], ["both", "どちらも"]].map(([k, l]) => (
              <button key={k} onClick={() => {
                  setStance(k);
                  if (k !== "uke" && !opened.includes("firms")) setOpened((p) => [...p, "firms"]);
                }}
                className="py-2.5 px-1 rounded-sm text-[12px] font-extrabold"
                style={{ background: stance === k ? C.ki : C.kami, color: C.sumi,
                  border: `1px solid ${stance === k ? C.ki : C.keisen}` }}>{l}</button>
            ))}
          </div>
        </DenpyoCard>

        <h2 className="text-[13px] font-extrabold mb-2 mt-5" style={{ color: C.sumi }}>
          これから使える機能
        </h2>
        <DenpyoCard tone={TONE.done}>
          <p className="text-[12px] mb-2" style={{ color: C.usu }}>
            全部を最初から覚える必要はありません。必要になったところで出てきます。
            一度出た機能は、その後ずっと使えます。
          </p>
          {[
            ["jobs", "案件をさがす", "最初から使えます"],
            ["msgs", "メッセージ", "最初から使えます"],
            ["firms", "会社をさがす", "案件を投稿するか、スカウトが届くと使えます"],
            ["docs", "取引（注文書・請求書）", "取引が始まると使えます"],
            ["photos", "工事写真・電子黒板", "注文請書を返すと使えます"],
          ].map(([k, l, cond]) => {
            const ok = isOpen(k);
            return (
              <div key={k} className="flex items-start gap-2 py-2"
                style={{ borderTop: `1px dashed ${C.keisen}` }}>
                {ok ? <Check size={16} style={{ color: C.midori, marginTop: 1, flexShrink: 0 }} />
                    : <Lock size={14} style={{ color: C.keisen, marginTop: 2, flexShrink: 0 }} />}
                <div className="flex-1">
                  <div className="text-[13px] font-bold" style={{ color: ok ? C.sumi : C.usu }}>{l}</div>
                  {!ok && <div className="text-[11px]" style={{ color: C.usu }}>{cond}</div>}
                </div>
              </div>
            );
          })}
          <div className="mt-3">
            <Btn tone={showAll ? "sumi" : "ki"} onClick={() => {
              setShowAll(!showAll); say(showAll ? "解放済みだけの表示に戻しました" : "全機能を表示しました");
            }}>
              {showAll ? "解放済みだけの表示に戻す（デモ）" : "全機能を表示する（デモ）"}
            </Btn>
            {(opened.length > 0 || showAll) && (
              <button onClick={() => {
                setOpened([]); setShowAll(false); setStance("uke"); setTab("jobs");
                say("登録直後の状態に戻しました");
              }} className="w-full mt-2 text-[12px] font-bold underline" style={{ color: C.usu }}>
                解放をリセットして最初から試す（デモ）
              </button>
            )}
          </div>
        </DenpyoCard>

        <h2 className="text-[13px] font-extrabold mb-2 mt-5" style={{ color: C.sumi }}>ログイン中の担当</h2>
        <DenpyoCard tone={R.amount ? "plain" : TONE.action}>
          <p className="text-[12px] mb-2" style={{ color: C.usu }}>
            会社の中で役割を分けられます。現場担当には金額を一切表示しません。
          </p>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {Object.values(ROLES).map((r) => (
              <button key={r.key} onClick={() => { setRole(r.key); say(`${r.name}に切り替えました`); }}
                className="py-2.5 px-1 rounded-sm text-[12px] font-extrabold"
                style={{ background: role === r.key ? C.ki : C.kami, color: C.sumi,
                  border: `1px solid ${role === r.key ? C.ki : C.keisen}` }}>{r.name}</button>
            ))}
          </div>
          {[["金額を見る", R.amount], ["注文書・請求書を出す", R.issue],
            ["取引完了を承認する", R.approve], ["日報を書く", R.report]].map(([l, ok], i) => (
            <div key={i} className="flex items-center gap-2 py-[3px]">
              {ok ? <Check size={15} style={{ color: C.midori, flexShrink: 0 }} />
                  : <Lock size={13} style={{ color: C.keisen, flexShrink: 0 }} />}
              <span className="text-[12px]" style={{ color: ok ? C.sumi : C.usu }}>{l}</span>
            </div>
          ))}
          <p className="text-[11px] mt-2" style={{ color: C.usu }}>
            プロトタイプです。切り替えて画面の変化を確認できます。
          </p>
        </DenpyoCard>

        <h2 className="text-[13px] font-extrabold mb-2 mt-5" style={{ color: C.sumi }}>プラン</h2>
        <DenpyoCard tone={plan === "free" ? "plain" : "midori"}>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-[16px] font-extrabold" style={{ color: C.sumi }}>{L.name}</span>
            <span className="text-[13px]" style={{ color: C.usu, fontFamily: MONO }}>
              {L.price === 0 ? "¥0" : `¥${L.price.toLocaleString("ja-JP")}／月`}
            </span>
          </div>
          {plan !== "prem" && (
            <div className="p-2 mb-3 rounded-sm" style={{ background: C.yojo }}>
              <div className="text-[11px] font-bold mb-1" style={{ color: C.usu }}>今月の残り</div>
              <div className="text-[12px]" style={{ color: C.sumi, fontFamily: MONO }}>
                {L.detail !== INF && `詳細 ${Math.max(0, L.detail - usedDetail.length)}／${lim(L.detail)}・`}
                やり取り {Math.max(0, L.send - usedMsg.length)}／{lim(L.send)}・
                スカウト送信 {Math.max(0, L.scout - scoutSent.length)}／{lim(L.scout)}・
                現場 {sites.length}／{lim(L.site)}
              </div>
            </div>
          )}
          <Btn tone="ki" onClick={() => { clearNav(); setPlansOpen(true); }}>プランを見る・変更する</Btn>
        </DenpyoCard>
      </div>
    </>
  );

  const NAV = [
    ["jobs", "案件", Briefcase],
    ["firms", "会社", Building2],
    ["msgs", "メッセージ", MessageSquare],
    ["docs", "取引", FileText],
    ["photos", "写真", Camera],
    ["me", "自社", HardHat],
  ];

  const tabOk = isOpen(tab);
  let body;
  if (!tabOk) body = Jobs();
  else if (plansOpen) body = PlansView();
  else if (partnerNew) body = PartnerNew();
  else if (postOpen) body = PostJob();
  else if (akiPost) body = AkiPost();
  else if (compose) body = Compose({ kind: compose });
  else if (docView) body = DocView({ doc: docView });
  else if (appsJob) body = Applications({ j: appsJob });
  else if (txForm) body = txForm.kind === "order" ? OrderForm({ cv: txForm.cv, tx: txForm.tx, req: txForm.req })
    : txForm.kind === "report" ? ReportForm({ tx: txForm.tx })
    : txForm.kind === "addreq" ? AddReqForm({ tx: txForm.tx })
    : InvoiceForm({ tx: txForm.tx });
  else if (txOpen) body = TxView({ tx: txOpen });
  else if (payOpen) body = PaymentView({ pay: payOpen });
  else if (company) body = CompanyView({ name: company });
  else if (scoutJob) body = ScoutList({ j: scoutJob });
  else if (inviteOpen) body = InviteView({ inv: inviteOpen });
  else if (msgJob) body = Thread({ cv: msgJob });
  else if (jobOpen) body = JobDetail({ j: jobOpen });
  else if (tab === "photos" && siteNew) body = SiteNew();
  else if (tab === "photos" && siteOpen && koushuOpen) body = KoushuView({ s: siteOpen, name: koushuOpen });
  else if (tab === "photos" && siteOpen) body = SiteDetail({ s: siteOpen });
  else if (tab === "jobs") body = Jobs();
  else if (tab === "firms") body = Firms();
  else if (tab === "msgs") body = Messages();
  else if (tab === "docs") body = Docs();
  else if (tab === "photos") body = SiteList();
  else body = Me();

  return (
    <div className="mx-auto max-w-md min-h-screen relative"
      style={{ background: C.yojo, fontFamily: FONT, color: C.sumi }}>
      <div className="pb-24">{body}</div>

      {confirm && <Confirm {...confirm} onCancel={() => setConfirm(null)} />}

      {cam && <LiveCamera b={bb} onClose={() => setCam(false)}
        onCapture={(url) => { setCam(false); savePhoto(url); }} />}

      {unlockMsg && (
        <button onClick={() => setUnlockMsg("")}
          className="fixed left-1/2 z-[55] w-full max-w-md px-3"
          style={{ transform: "translateX(-50%)", bottom: 84 }}>
          <div className="flex items-center gap-2 px-3 py-3 rounded-sm"
            style={{ background: C.ki, border: `2px solid ${C.sumi}` }}>
            <span className="text-[18px]">🔓</span>
            <div className="flex-1 text-left">
              <div className="text-[13px] font-extrabold" style={{ color: C.sumi }}>{unlockMsg}</div>
              <div className="text-[11px]" style={{ color: C.sumi }}>下のメニューに追加されました</div>
            </div>
            <X size={16} style={{ color: C.sumi }} />
          </div>
        </button>
      )}

      {toast && (
        <div className="fixed left-1/2 bottom-24 z-[60] px-4 py-2 rounded-sm text-[13px] font-bold"
          style={{ transform: "translateX(-50%)", background: C.sumi, color: "#fff", maxWidth: "88%" }}>
          {toast}
        </div>
      )}

      {!msgJob && (
        <nav className="fixed bottom-0 left-1/2 w-full max-w-md flex z-30"
          style={{ transform: "translateX(-50%)", background: C.sumi, borderTop: `3px solid ${C.ki}` }}>
          {NAV.filter(([k]) => isOpen(k)).map(([k, l, Icon]) => {
            const on = tab === k && !compose && !jobOpen && !postOpen && !akiPost && !plansOpen;
            const badge = k === "msgs"
              ? Object.keys(threads).reduce((n, key) => n + unread(key), 0) + unreadInv : 0;
            return (
              <button key={k} onClick={() => { clearNav(); setTab(k); }}
                className="flex-1 flex flex-col items-center gap-1 py-2.5 relative">
                {badge > 0 && (
                  <span className="absolute text-[9px] font-bold px-1.5 rounded-full"
                    style={{ background: C.aka, color: "#fff", top: 4, right: "50%", marginRight: -20 }}>
                    {badge}
                  </span>
                )}
                <Icon size={18} color={on ? C.ki : "rgba(255,255,255,.55)"} />
                <span className="text-[9px] font-bold whitespace-nowrap"
                  style={{ color: on ? C.ki : "rgba(255,255,255,.55)" }}>{l}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
