-- 案件の「受注する側の下請次数」。プロトタイプ（動く仕様書）とdocs/11_シードデータ.md
-- 「動作確認シナリオ」表には元からある項目だったが、docs/01_実装設計書.mdのjobsテーブル定義
-- には含まれておらず抜けていた。CLAUDE.md用語集にも「1次下請／2次下請／3次下請」と
-- 明記されている項目のため追加する。

alter table jobs add column jisu text check (jisu in ('1次下請', '2次下請', '3次下請'));

-- 既存シード（docs/11_シードデータ.md 動作確認シナリオの案件一覧）を名前で補完
update jobs set jisu = '1次下請' where name = '五井中央 共同住宅 外部足場';
update jobs set jisu = '2次下請' where name = '千住 戸建 外壁塗装';
update jobs set jisu = '1次下請' where name = '川口栄町 木造解体';
update jobs set jisu = '2次下請' where name = '船橋 現場応援（足場 常用）';
update jobs set jisu = '3次下請' where name = '浦安 事務所ビル 内装解体';
update jobs set jisu = '1次下請' where name = '市川 倉庫 外部足場';
update jobs set jisu = '1次下請' where name = '市原市営住宅 外壁改修 仮設足場';

-- 上記に該当しない既存行（実際にアプリから投稿された案件など）は暫定で1次下請にしておく。
-- 本来は募集者に選び直してもらうべきだが、必須項目化のためのフォールバック。
update jobs set jisu = '1次下請' where jisu is null;

alter table jobs alter column jisu set not null;
