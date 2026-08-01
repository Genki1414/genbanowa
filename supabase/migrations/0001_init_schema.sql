-- ゲンバノワ 初期スキーマ
-- 出典: docs/01_実装設計書.md 第1章、docs/04_権限ロール設計.md（site_assignments, audit_logs）
-- 段階開放（unlocked_features）と stance は必ずここに含める。後から足すと既存ユーザーの埋め直しが発生する。

create extension if not exists pgcrypto;

-- ============================================================
-- 1-1. 企業とユーザー
-- ============================================================

create table companies (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  kana              text,
  type              text not null check (type in ('corp', 'sole')), -- 法人／個人事業主
  rep_name          text,
  established       text,
  postal            text,
  address           text,
  tel               text,
  url               text, -- HP・SNS（プロ以上で開示）
  industries        text[] not null default '{}',
  service_areas     text[] not null default '{}',
  license_no        text,
  license_types     text[],
  license_expiry    date,
  insurance         jsonb not null default '{}'::jsonb, -- {kenpo, kounen, koyou, rousai_uwanose}
  invoice_no        text,
  ccus_id           text,
  plan              text not null default 'free' check (plan in ('free', 'std', 'pro', 'prem')),
  plan_since        timestamptz,
  stance            text not null default 'uke' check (stance in ('uke', 'moto', 'both')),
  unlocked_features text[] not null default '{}', -- 追加のみ。取り消し処理は作らない
  trust_score       int not null default 0,
  trust_level       text not null default '未認証',
  invite_points     int not null default 1, -- スカウト閲覧ポイント（無料プラン用・非リセット）
  -- accounting ロールが単独で承認できる請求の上限。04_権限ロール設計.md 2-1の「△」
  invoice_approval_limit bigint not null default 500000,
  created_at        timestamptz not null default now()
);
create index on companies using gin (industries);
create index on companies using gin (service_areas);
create index on companies (trust_score desc);

create table users (
  id            uuid primary key references auth.users(id) on delete cascade,
  company_id    uuid not null references companies(id) on delete cascade,
  name          text not null,
  role          text not null default 'field'
                check (role in ('owner', 'admin', 'accounting', 'field', 'viewer')),
  tel           text,
  line_user_id  text,
  push_token    text,
  created_at    timestamptz not null default now()
);
create index on users (company_id);

-- ============================================================
-- 1-2. 信用（書類とスコア）
-- ============================================================

create table trust_documents (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  kind         text not null check (kind in
               ('tohon', 'kaigyo', 'kyoka', 'hoken', 'baisho', 'invoice', 'ccus', 'hp')),
  file_path    text,
  value        text,
  status       text not null default 'pending'
               check (status in ('pending', 'approved', 'rejected')),
  reviewed_by  uuid references users(id),
  reviewed_at  timestamptz,
  reject_note  text,
  created_at   timestamptz not null default now(),
  unique (company_id, kind)
);

create table trust_doc_points (
  kind   text primary key,
  points int not null,
  label  text not null
);
insert into trust_doc_points values
  ('tohon', 20, '履歴事項全部証明書（謄本）'),
  ('kyoka', 15, '建設業許可証'),
  ('hoken', 15, '社会保険・労災の加入書類'),
  ('kaigyo', 10, '開業届 または 定款'),
  ('baisho', 10, '請負業者賠償責任保険の証券'),
  ('invoice', 10, 'インボイス登録番号'),
  ('ccus', 10, 'CCUS事業者ID'),
  ('hp', 5, '自社ホームページ・SNS');

create table trust_ratings (
  company_id uuid primary key references companies(id) on delete cascade,
  stars      numeric(2, 1) not null check (stars between 1.0 and 5.0),
  note       text,
  rated_by   uuid references users(id),
  rated_at   timestamptz not null default now()
);

-- ============================================================
-- 1-3. 案件・応募・空き情報・スカウト
-- ============================================================

create table jobs (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references companies(id) on delete cascade, -- 発注者
  name           text not null,
  keishiki       text not null check (keishiki in ('ukeoi', 'ouen')), -- 請負／応援（常用）
  industry       text not null,
  area           text not null,
  site_address   text,
  scale          text,
  koki_from      date,
  koki_to        date,
  boshu_from     date,
  boshu_to       date,
  price_mode     text check (price_mode in ('sashine', 'mitsumori')),
  price          bigint default 0,
  quote_due      date,
  tanka          bigint default 0,
  headcount      int default 0,
  payment_terms  text,
  is_public_work boolean not null default false,
  status         text not null default 'open' check (status in ('open', 'paused', 'closed')),
  posted_at      timestamptz not null default now()
);
create index on jobs (status, industry, area);
create index on jobs (company_id);

create table job_applications (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references jobs(id) on delete cascade,
  company_id      uuid not null references companies(id) on delete cascade, -- 応募者
  amount          bigint,
  message         text,
  conversation_id uuid, -- やり取りを開始したら紐づく（conversations作成後にFK追加）
  created_at      timestamptz not null default now(),
  unique (job_id, company_id)
);

create table availabilities (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  kind        text not null check (kind in ('ninku', 'waku')), -- 人工の空き／工事枠の空き
  industry    text not null,
  area        text not null,
  from_date   date not null,
  to_date     date not null,
  headcount   int default 0,
  tanka       bigint default 0, -- 0は応相談
  note        text,
  status      text not null default 'open' check (status in ('open', 'withdrawn', 'expired')),
  posted_at   timestamptz not null default now()
);
create index on availabilities (status, industry, area, to_date);

create table scouts (
  id               uuid primary key default gen_random_uuid(),
  from_company     uuid not null references companies(id) on delete cascade,
  to_company       uuid not null references companies(id) on delete cascade,
  kind             text not null check (kind in ('scout', 'quote_request')),
  job_id           uuid references jobs(id) on delete set null,
  availability_id  uuid references availabilities(id) on delete set null,
  message          text not null,
  opened_at        timestamptz, -- 閲覧ポイント消費の記録
  replied_at       timestamptz,
  created_at       timestamptz not null default now()
);
create index on scouts (to_company, created_at desc);

-- ============================================================
-- 1-4. 会話とメッセージ
-- ============================================================

create table conversations (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('job', 'direct')),
  job_id      uuid references jobs(id) on delete set null,
  company_a   uuid not null references companies(id) on delete cascade,
  company_b   uuid not null references companies(id) on delete cascade,
  last_at     timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
-- 同じ相手×同じ案件で重複しないように
create unique index on conversations (
  kind,
  coalesce(job_id, '00000000-0000-0000-0000-000000000000'::uuid),
  least(company_a, company_b),
  greatest(company_a, company_b)
);

alter table job_applications
  add constraint job_applications_conversation_id_fkey
  foreign key (conversation_id) references conversations(id) on delete set null;

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_company  uuid not null references companies(id),
  sender_user     uuid references users(id),
  body            text,
  attachment      jsonb, -- {kind:'material'|'estimate'|'order'|'invoice', name, path, amount}
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index on messages (conversation_id, created_at);

-- ============================================================
-- 1-5. 取引（本体）
-- ============================================================

create table transactions (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid references conversations(id) on delete set null,
  job_id           uuid references jobs(id) on delete set null,
  moto_company     uuid not null references companies(id), -- 発注側
  uke_company      uuid not null references companies(id), -- 受注側
  title            text not null,
  closing_day      text,
  payment_terms    text,
  status           text not null default 'active'
                   check (status in ('active', 'completion_requested', 'completed', 'cancelled')),
  snapshot         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);
create index on transactions (moto_company, status);
create index on transactions (uke_company, status);

-- 注文書（1取引に複数枚。追加工事は2枚目以降）
create table orders (
  id             uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  seq            int not null, -- No.1, No.2 ...
  keishiki       text not null check (keishiki in ('ukeoi', 'ninku')),
  amount         bigint not null default 0, -- 請負代金（税抜）
  tanka          bigint not null default 0, -- 人工単価
  koki_from      date not null,
  koki_to        date not null,
  site_address   text,
  payment_terms  text not null,
  note           text,
  pdf_path       text,
  issued_at      timestamptz not null default now(),
  accepted_at    timestamptz, -- 注文請書の返送
  rejected_at    timestamptz, -- 差し戻し
  reject_note    text,
  unique (transaction_id, seq)
);

-- 追加工事の注文書依頼（受注側から）
create table order_requests (
  id             uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  description    text not null,
  est_amount     bigint default 0,
  koki_from      date,
  koki_to        date,
  status         text not null default 'requested'
                 check (status in ('requested', 'issued', 'declined')),
  issued_order   uuid references orders(id),
  created_at     timestamptz not null default now()
);

-- 作業日報（全業種共通の進捗）
create table daily_reports (
  id             uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  work_date      date not null,
  headcount      int not null default 0,
  content        text not null,
  note           text,
  created_by     uuid references users(id),
  created_at     timestamptz not null default now()
);
create index on daily_reports (transaction_id, work_date);

-- 請求書（注文書1枚に紐づく。取引完了まで何度でも）
create table invoices (
  id             uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  order_id       uuid not null references orders(id), -- 1枚の請求書に複数の注文書は不可
  amount         bigint not null, -- 税抜
  tax            bigint not null,
  basis          text not null check (basis in ('full', 'manual', 'ninku_month')),
  target_month   date, -- 人工精算の対象月（月初日で保持）
  ninku_total    numeric(5, 1) default 0,
  due_date       date not null,
  status         text not null default 'submitted'
                 check (status in ('submitted', 'approved', 'paid', 'received', 'rejected')),
  approved_at    timestamptz,
  paid_at        timestamptz, -- 発注側が支払を登録した時刻
  received_at    timestamptz, -- 受注側が入金を確認した時刻
  received_on    date, -- 実際の入金日（期日内判定に使う）
  pdf_path       text,
  created_at     timestamptz not null default now()
);
create index on invoices (transaction_id);
create unique index on invoices (order_id, target_month) where target_month is not null;

-- 現場担当の「担当のみ」表示（04_権限ロール設計.md 3章）
create table site_assignments (
  transaction_id uuid not null references transactions(id) on delete cascade,
  user_id        uuid not null references users(id) on delete cascade,
  assigned_at    timestamptz not null default now(),
  primary key (transaction_id, user_id)
);

-- ============================================================
-- 1-6. 入金確認と異議申立
-- ============================================================

create table payment_disputes (
  id             uuid primary key default gen_random_uuid(),
  invoice_id     uuid not null references invoices(id) on delete cascade,
  status         text not null default 'overdue' check (status in
                 ('overdue', 'confirming', 'date_proposed', 'objected', 'under_review', 'resolved', 'recorded')),
  proposed_date  date, -- 発注側が申告した支払予定日
  objection      text,
  decided_by     uuid references users(id), -- 運営の判断者
  decided_at     timestamptz,
  decision_note  text,
  created_at     timestamptz not null default now()
);

create table payment_dispute_logs (
  id          uuid primary key default gen_random_uuid(),
  dispute_id  uuid not null references payment_disputes(id) on delete cascade,
  actor       text not null, -- 'uke' | 'moto' | 'admin' | 'system'
  text        text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 1-7. 現場と工事写真
-- ============================================================

create table sites (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references companies(id) on delete cascade,
  transaction_id uuid references transactions(id) on delete set null,
  name           text not null,
  address        text,
  created_at     timestamptz not null default now(),
  archived_at    timestamptz
);

create table photos (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references sites(id) on delete cascade,
  koushu      text not null, -- 工種（フォルダ）
  koutei      text not null check (koutei in ('着手前', '施工中', '施工後', '完了検査')),
  spot        text,
  shot_at     timestamptz not null,
  gps         point,
  file_path   text not null, -- 黒板合成済み
  raw_path    text, -- 元画像（将来の公共対応に備えて保持。暫定90日保持）
  sha256      text, -- 改ざん検知の土台
  created_at  timestamptz not null default now()
);
create index on photos (site_id, koushu, koutei);

-- ============================================================
-- 1-8. 取引先とアプリ外書類
-- ============================================================

create table partners (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references companies(id) on delete cascade, -- 登録した側
  linked_company uuid references companies(id), -- アプリ内会社と紐づいたら入る
  name           text not null,
  contact_name   text,
  closing_day    text,
  payment_terms  text,
  email          text,
  tel            text,
  created_at     timestamptz not null default now()
);

create table invitations (
  id                  uuid primary key default gen_random_uuid(),
  partner_id          uuid references partners(id) on delete cascade,
  from_company        uuid not null references companies(id) on delete cascade,
  channel             text not null check (channel in ('email', 'sms', 'line')),
  destination         text not null,
  token               text not null unique,
  sent_at             timestamptz not null default now(),
  opened_at           timestamptz,
  registered_company  uuid references companies(id)
);

-- アプリ外の取引先向けに単独発行する書類
create table standalone_documents (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  partner_id    uuid references partners(id),
  kind          text not null check (kind in ('estimate', 'order', 'invoice')),
  title         text not null,
  site_address  text,
  koki          text,
  amount        bigint not null,
  tax           bigint not null,
  pdf_path      text,
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- 1-9. プランと使用量
-- ============================================================

create table plan_limits (
  plan               text primary key,
  detail_per_month   int, -- null=無制限
  send_total         int,
  recv_per_month     int, -- null=ポイント制 or 無制限。recv_mode で区別
  recv_mode          text not null default 'unlimited' check (recv_mode in ('points', 'unlimited')),
  scout_per_month    int,
  post_per_month     int, -- null=無制限
  availability_slots int,
  site_slots         int, -- null=無制限
  storage_gb         int, -- null=無制限
  user_slots         int, -- null=無制限。金額を扱えるユーザー数
  can_issue_docs     boolean not null default false,
  info_level         int not null default 0
);
insert into plan_limits
  (plan, detail_per_month, send_total, recv_per_month, recv_mode, scout_per_month, post_per_month,
   availability_slots, site_slots, storage_gb, user_slots, can_issue_docs, info_level)
values
  ('free', 3,    1,  null, 'points',    1,  1,    1,  2,    1,    1,    false, 0),
  ('std',  null, 5,  null, 'unlimited', 5,  null, 3,  5,    10,   3,    true,  1),
  ('pro',  null, 15, null, 'unlimited', 15, null, 6,  15,   50,   10,   true,  2),
  ('prem', null, 40, null, 'unlimited', 40, null, null, null, null, null, true, 3);

-- 月次カウンタ。月初にリセットされるものだけを持つ
create table usage_counters (
  company_id    uuid not null references companies(id) on delete cascade,
  period        date not null, -- 月初日
  detail_views  int not null default 0,
  scouts_sent   int not null default 0,
  jobs_posted   int not null default 0,
  primary key (company_id, period)
);
-- やり取りは実体（conversations）の件数を月で数える。閲覧ポイントは companies.invite_points（リセットしない）

-- ============================================================
-- 1-11. 通知
-- ============================================================

create table notifications (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  user_id     uuid references users(id), -- null なら会社全員
  event       text not null, -- 通知設計書のイベントID
  title       text not null,
  body        text not null,
  link        text not null,
  channels    text[] not null default '{push}',
  read_at     timestamptz,
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index on notifications (company_id, created_at desc) where read_at is null;

-- ============================================================
-- 監査ログ（04_権限ロール設計.md 6章）
-- ============================================================

create table audit_logs (
  id          bigserial primary key,
  company_id  uuid not null,
  user_id     uuid,
  action      text not null, -- 'order.issue' 'invoice.approve' ...
  entity      text not null, -- 'orders' 'invoices' ...
  entity_id   uuid,
  before      jsonb,
  after       jsonb,
  ip          inet,
  created_at  timestamptz not null default now()
);
create index on audit_logs (company_id, created_at desc);
create index on audit_logs (entity, entity_id);
