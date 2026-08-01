-- ゲンバノワ 開発用シードデータ
-- 出典: docs/11_シードデータ.md（プロトタイプ .jsx と同じ内容）
--
-- ★★★ 開発中の動作確認用。本番には絶対に投入しないこと。 ★★★
--
-- auth.users（ログインユーザー）はこのSQLでは作成しない。Supabase Auth 側でユーザーを作成した後、
-- 下記のような insert で users テーブルと紐づけること（company_id は高橋工業のid）。
--
--   insert into users (id, company_id, name, role)
--   values ('<auth.usersのuuid>', (select id from companies where name = '高橋工業'), '代表 太郎', 'owner');

-- ============================================================
-- 会社
-- ============================================================

insert into companies (name, type, rep_name, established, address, industries, service_areas,
  license_no, insurance, ccus_id, plan, stance, unlocked_features, invite_points)
values
  ('高橋工業', 'corp', null, null, '千葉県', array['足場', '解体'], array['千葉県', '東京都', '埼玉県'],
   '千葉県知事 般-4 第12345号', '{"kenpo":true,"kounen":true,"koyou":true}'::jsonb, 'あり',
   'free', 'both', array['jobs', 'messages', 'me'], 1);

insert into companies (name, type, rep_name, established, address, industries, license_no)
values
  ('京葉建設工業', 'corp', '佐藤 健一', '2005', '千葉県市原市', array['土木', '建築'], '千葉県知事 般-2 第00812号'),
  ('彩北総業', 'corp', '大野 誠', '1998', '埼玉県川口市', array['解体', '土木'], '埼玉県知事 特-3 第01199号'),
  ('北千住リフォーム', 'sole', '石川 由美', '2019', '東京都足立区', array['塗装', '内装'], '登録なし'),
  ('湾岸工業', 'corp', '森 拓也', '2012', '千葉県船橋市', array['足場'], '千葉県知事 般-4 第02233号'),
  ('東和内装', 'sole', '内田 亮', '2021', '千葉県浦安市', array['内装'], '登録なし'),
  ('三和架設', 'corp', '山口 剛', '2010', '千葉県船橋市', array['足場'], '千葉県知事 般-3 第01820号'),
  ('丸和塗装', 'corp', '村上 直人', '2016', '東京都足立区', array['塗装'], '東京都知事 般-5 第03310号'),
  ('城東解体工業', 'sole', '高木 修', '2020', '東京都江戸川区', array['解体'], '登録なし'),
  ('松本内装', 'sole', '松本 康', '2014', '埼玉県草加市', array['内装'], '埼玉県知事 般-4 第02901号'),
  ('東葛工業', 'corp', '斉藤 洋', '2001', '千葉県柏市', array['足場', 'とび'], '千葉県知事 特-2 第00455号');

-- 星評価（運営付与）
insert into trust_ratings (company_id, stars)
select id, s.stars from companies, (values
  ('京葉建設工業', 4.3), ('彩北総業', 4.8), ('北千住リフォーム', 2.9), ('湾岸工業', 3.9),
  ('東和内装', 3.1), ('三和架設', 4.5), ('丸和塗装', 4.0), ('城東解体工業', 3.4),
  ('松本内装', 4.1), ('東葛工業', 4.7)
) as s(name, stars)
where companies.name = s.name;

-- 提出済み書類（承認済みとして投入。11_シードデータ.md の「提出書類」列）
insert into trust_documents (company_id, kind, status)
select c.id, d.kind, 'approved' from companies c, (values
  ('京葉建設工業', 'tohon'), ('京葉建設工業', 'kyoka'), ('京葉建設工業', 'hoken'),
  ('京葉建設工業', 'baisho'), ('京葉建設工業', 'invoice'), ('京葉建設工業', 'hp'),
  ('彩北総業', 'tohon'), ('彩北総業', 'kyoka'), ('彩北総業', 'hoken'), ('彩北総業', 'baisho'),
  ('彩北総業', 'invoice'), ('彩北総業', 'ccus'), ('彩北総業', 'hp'),
  ('北千住リフォーム', 'kaigyo'), ('北千住リフォーム', 'hp'),
  ('湾岸工業', 'tohon'), ('湾岸工業', 'kyoka'), ('湾岸工業', 'hoken'), ('湾岸工業', 'invoice'),
  ('東和内装', 'kaigyo'),
  ('三和架設', 'tohon'), ('三和架設', 'kyoka'), ('三和架設', 'hoken'), ('三和架設', 'baisho'), ('三和架設', 'ccus'),
  ('丸和塗装', 'tohon'), ('丸和塗装', 'kyoka'), ('丸和塗装', 'hoken'),
  ('城東解体工業', 'kaigyo'), ('城東解体工業', 'hoken'),
  ('松本内装', 'tohon'), ('松本内装', 'kyoka'), ('松本内装', 'hoken'), ('松本内装', 'invoice'),
  ('東葛工業', 'tohon'), ('東葛工業', 'kyoka'), ('東葛工業', 'hoken'), ('東葛工業', 'baisho'),
  ('東葛工業', 'invoice'), ('東葛工業', 'ccus'), ('東葛工業', 'hp'),
  ('高橋工業', 'kyoka'), ('高橋工業', 'hoken'), ('高橋工業', 'ccus')
) as d(name, kind)
where c.name = d.name;

update companies set trust_score = 35, trust_level = 'Bronze' where name = '高橋工業';

-- ============================================================
-- 案件
-- ============================================================

insert into jobs (company_id, name, keishiki, industry, area, site_address, scale,
  koki_from, koki_to, boshu_from, boshu_to, price_mode, price, quote_due, tanka, headcount,
  payment_terms, is_public_work, status, posted_at)
values
  ((select id from companies where name = '京葉建設工業'), '五井中央 共同住宅 外部足場', 'ukeoi', '足場',
   '千葉県市原市', '市原市五井中央西2-1-8', '1,240㎡', '2026-09-01', '2026-09-20',
   '2026-08-01', '2026-08-25', 'sashine', 1860000, null, 0, 0, '翌月末', false, 'open', '2026-08-01'),
  ((select id from companies where name = '北千住リフォーム'), '千住 戸建 外壁塗装', 'ukeoi', '塗装',
   '東京都足立区', '足立区千住3-14-2', '780㎡', '2026-09-08', '2026-09-30',
   '2026-07-28', '2026-08-20', 'mitsumori', 0, '2026-08-20', 0, 0, '翌々月10日', false, 'paused', '2026-07-28'),
  ((select id from companies where name = '彩北総業'), '川口栄町 木造解体', 'ukeoi', '解体',
   '埼玉県川口市', '川口市栄町3-2-11', '木造2階1棟', '2026-10-01', '2026-10-15',
   '2026-08-05', '2026-09-10', 'sashine', 2400000, null, 0, 0, '翌月末', false, 'open', '2026-08-05'),
  ((select id from companies where name = '湾岸工業'), '船橋 現場応援（足場 常用）', 'ouen', '足場',
   '千葉県船橋市', '船橋市浜町2-1-1', '3人/日', '2026-08-25', '2026-09-12',
   '2026-08-10', '2026-08-22', 'sashine', 0, null, 22000, 3, '翌月末', false, 'open', '2026-08-10'),
  ((select id from companies where name = '東和内装'), '浦安 事務所ビル 内装解体', 'ukeoi', '内装',
   '千葉県浦安市', '浦安市入船4-1-1', '420㎡', '2026-08-20', '2026-08-31',
   '2026-07-10', '2026-07-31', 'mitsumori', 0, '2026-07-25', 0, 0, '翌月末', false, 'closed', '2026-07-10'),
  ((select id from companies where name = '高橋工業'), '市川 倉庫 外部足場', 'ukeoi', '足場',
   '千葉県市川市', '市川市塩浜2-1-1', '860㎡', '2026-09-05', '2026-09-18',
   '2026-08-08', '2026-08-24', 'mitsumori', 0, '2026-08-25', 0, 0, '翌月末', false, 'open', '2026-08-08'),
  ((select id from companies where name = '京葉建設工業'), '市原市営住宅 外壁改修 仮設足場', 'ukeoi', '足場',
   '千葉県市原市', '市原市辰巳台東3-1', '2,340㎡', '2026-10-05', '2026-11-14',
   '2026-08-14', '2026-09-05', 'sashine', 3420000, null, 0, 0, '翌月末', true, 'open', '2026-08-14');

-- 応募（案件6・自社案件への応募）
insert into job_applications (job_id, company_id, amount, message, created_at)
select
  (select id from jobs where name = '市川 倉庫 外部足場'),
  (select id from companies where name = a.name),
  a.amount, a.message, '2026-08-01'
from (values
  ('三和架設', 1240000, '9/5から4名で入れます。資材はこちらで手配できます。'),
  ('東葛工業', 1180000, '同規模の倉庫を今年3件やっています。足場材は自社保有です。'),
  ('城東解体工業', 1350000, '9/8以降であれば対応可能です。')
) as a(name, amount, message);

-- 空き情報
insert into availabilities (company_id, kind, industry, area, from_date, to_date, headcount, tanka, note)
values
  ((select id from companies where name = '三和架設'), 'ninku', '足場', '千葉県船橋市',
   '2026-09-01', '2026-09-25', 3, 23000, '3名空いています。市原・船橋周辺なら即日対応できます。'),
  ((select id from companies where name = '丸和塗装'), 'waku', '塗装', '東京都足立区',
   '2026-09-01', '2026-09-30', 0, 0, '9月の塗装工事を募集しています。戸建・アパートどちらも対応します。'),
  ((select id from companies where name = '城東解体工業'), 'ninku', '解体', '東京都江戸川区',
   '2026-08-25', '2026-09-05', 2, 20000, '2名手が空きます。木造・内装解体に対応できます。');

-- 受信したスカウト・見積依頼
insert into scouts (from_company, to_company, kind, job_id, message, created_at)
values
  ((select id from companies where name = '湾岸工業'), (select id from companies where name = '高橋工業'),
   'scout', (select id from jobs where name = '船橋 現場応援（足場 常用）'),
   '船橋の応援の件です。御社の対応エリアと工種が合っていたので声を掛けました。3人お願いできませんか。', '2026-08-13'),
  ((select id from companies where name = '北千住リフォーム'), (select id from companies where name = '高橋工業'),
   'quote_request', (select id from jobs where name = '千住 戸建 外壁塗装'),
   '千住の外壁塗装、足場込みでお見積りをお願いできますか。提出期限は8/20です。', '2026-08-13');

-- ============================================================
-- 会話・メッセージ
-- ============================================================

insert into conversations (kind, job_id, company_a, company_b, created_at, last_at)
values
  ('job', (select id from jobs where name = '五井中央 共同住宅 外部足場'),
   (select id from companies where name = '高橋工業'), (select id from companies where name = '京葉建設工業'),
   '2026-08-12', '2026-08-12'),
  ('job', (select id from jobs where name = '川口栄町 木造解体'),
   (select id from companies where name = '高橋工業'), (select id from companies where name = '彩北総業'),
   '2026-08-09', '2026-08-09'),
  ('direct', null,
   (select id from companies where name = '高橋工業'), (select id from companies where name = '三和架設'),
   '2026-08-14', '2026-08-14'),
  ('direct', null,
   (select id from companies where name = '高橋工業'), (select id from companies where name = '丸和塗装'),
   '2026-08-02', '2026-08-02');

insert into messages (conversation_id, sender_company, body, created_at)
values
  ((select id from conversations where job_id = (select id from jobs where name = '五井中央 共同住宅 外部足場')),
   (select id from companies where name = '京葉建設工業'), 'ご応募ありがとうございます。9/1着工で動けますか。', '2026-08-12 10:24'),
  ((select id from conversations where job_id = (select id from jobs where name = '五井中央 共同住宅 外部足場')),
   (select id from companies where name = '高橋工業'), '問題ありません。搬入は前日夕方でも大丈夫でしょうか。', '2026-08-12 11:02'),
  ((select id from conversations where job_id = (select id from jobs where name = '五井中央 共同住宅 外部足場')),
   (select id from companies where name = '京葉建設工業'), '前日16時以降でお願いします。ゲートは南側です。', '2026-08-12 11:15'),
  ((select id from conversations where company_a = (select id from companies where name = '高橋工業')
      and company_b = (select id from companies where name = '三和架設')),
   (select id from companies where name = '高橋工業'), 'はじめまして。9月に応援でお願いできる日はありますか。', '2026-08-14 09:12');

-- ============================================================
-- 取引1：自社が受注・進行中（京葉建設工業／五井中央 外部足場）
-- ============================================================

insert into transactions (conversation_id, job_id, moto_company, uke_company, title, closing_day, payment_terms, status, created_at)
values (
  (select id from conversations where job_id = (select id from jobs where name = '五井中央 共同住宅 外部足場')),
  (select id from jobs where name = '五井中央 共同住宅 外部足場'),
  (select id from companies where name = '京葉建設工業'),
  (select id from companies where name = '高橋工業'),
  '五井中央 共同住宅 外部足場', '20日', '翌月末', 'active', '2026-08-12'
);

insert into orders (transaction_id, seq, keishiki, amount, koki_from, koki_to, site_address, payment_terms, note, issued_at, accepted_at)
values
  ((select id from transactions where title = '五井中央 共同住宅 外部足場'), 1, 'ukeoi', 1860000,
   '2026-09-01', '2026-09-20', '市原市五井中央西2-1-8', '翌月末', '本工事', '2026-08-12', '2026-08-13'),
  ((select id from transactions where title = '五井中央 共同住宅 外部足場'), 2, 'ukeoi', 240000,
   '2026-09-10', '2026-09-14', '市原市五井中央西2-1-8', '翌月末', '追加：north面のハネ出し', '2026-09-08', null);

insert into daily_reports (transaction_id, work_date, headcount, content, note)
values
  ((select id from transactions where title = '五井中央 共同住宅 外部足場'), '2026-09-01', 4, '資材搬入、北面の建地建て込み', '晴れ'),
  ((select id from transactions where title = '五井中央 共同住宅 外部足場'), '2026-09-02', 4, '東西面の組立、メッシュシート張り', ''),
  ((select id from transactions where title = '五井中央 共同住宅 外部足場'), '2026-09-03', 3, '南面の組立、昇降階段の設置', '午後から小雨');

insert into invoices (transaction_id, order_id, amount, tax, basis, due_date, status, received_at, received_on)
values (
  (select id from transactions where title = '五井中央 共同住宅 外部足場'),
  (select id from orders where transaction_id = (select id from transactions where title = '五井中央 共同住宅 外部足場') and seq = 1),
  1200000, 120000, 'manual', '2026-09-30', 'received', '2026-09-28', '2026-09-28'
);

-- ============================================================
-- 取引2：自社が受注・請書待ち（彩北総業／川口栄町 木造解体）
-- ============================================================

insert into transactions (conversation_id, job_id, moto_company, uke_company, title, closing_day, payment_terms, status, created_at)
values (
  (select id from conversations where job_id = (select id from jobs where name = '川口栄町 木造解体')),
  (select id from jobs where name = '川口栄町 木造解体'),
  (select id from companies where name = '彩北総業'),
  (select id from companies where name = '高橋工業'),
  '川口栄町 木造解体', '末日', '翌月末', 'active', '2026-08-09'
);

insert into orders (transaction_id, seq, keishiki, amount, koki_from, koki_to, site_address, payment_terms, note, issued_at)
values (
  (select id from transactions where title = '川口栄町 木造解体'), 1, 'ukeoi', 2400000,
  '2026-10-01', '2026-10-15', '川口市栄町3-2-11', '翌月末', '近隣説明が済み次第の着工', '2026-08-09'
);

-- ============================================================
-- 取引3：自社が発注・進行中・人工契約（丸和塗装／浦安 内装 応援）
-- ============================================================

insert into transactions (conversation_id, job_id, moto_company, uke_company, title, closing_day, payment_terms, status, created_at)
values (
  (select id from conversations where company_a = (select id from companies where name = '高橋工業')
     and company_b = (select id from companies where name = '丸和塗装')),
  null,
  (select id from companies where name = '高橋工業'),
  (select id from companies where name = '丸和塗装'),
  '浦安 事務所ビル 内装（応援）', '末日', '翌々月10日', 'active', '2026-08-02'
);

insert into orders (transaction_id, seq, keishiki, tanka, koki_from, koki_to, site_address, payment_terms, note, issued_at, accepted_at)
values (
  (select id from transactions where title = '浦安 事務所ビル 内装（応援）'), 1, 'ninku', 22000,
  '2026-08-20', '2026-08-31', '浦安市入船4-1-1', '翌々月10日', '常用での応援', '2026-08-02', '2026-08-03'
);

insert into daily_reports (transaction_id, work_date, headcount, content)
values
  ((select id from transactions where title = '浦安 事務所ビル 内装（応援）'), '2026-08-20', 2, '養生、既存内装の撤去'),
  ((select id from transactions where title = '浦安 事務所ビル 内装（応援）'), '2026-08-21', 3, '天井・間仕切りの解体'),
  ((select id from transactions where title = '浦安 事務所ビル 内装（応援）'), '2026-08-25', 3, '残材搬出、清掃');

insert into order_requests (transaction_id, description, est_amount, koki_from, koki_to, status, created_at)
values (
  (select id from transactions where title = '浦安 事務所ビル 内装（応援）'),
  '3階部分の追加解体', 90000, '2026-08-28', '2026-08-31', 'requested', '2026-08-26'
);

-- ============================================================
-- 取引先（アプリ外含む）
-- ============================================================

insert into partners (company_id, linked_company, name, contact_name, closing_day, payment_terms, email)
values
  ((select id from companies where name = '高橋工業'), (select id from companies where name = '京葉建設工業'),
   '京葉建設工業', '佐藤', '20日', '翌月末', null),
  ((select id from companies where name = '高橋工業'), null,
   '丸和塗装', '村上', '末日', '翌々月10日', 'murakami@example.jp'),
  ((select id from companies where name = '高橋工業'), (select id from companies where name = '彩北総業'),
   '彩北総業', '大野', '末日', '翌月末', null),
  ((select id from companies where name = '高橋工業'), null,
   '大久保工務店', '大久保', '末日', '翌月20日', 'okubo@example.jp');
