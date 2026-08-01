
/* ============================================================
   Google フォーム連携
   1) Google フォームを新規作成し、質問を2つ作る
      ・「メールアドレス」（記述式・必須）
      ・「どちらですか」（記述式／自動で入ります）
   2) 右上「送信」→ リンクタブ の URL から FORM_ID をコピー
      https://docs.google.com/forms/d/e/★ここ★/viewform
   3) プレビューでフォームを開き、右クリック→ページのソースを表示。
      「entry.123456789」を検索して、質問ごとの ID を控える
   4) 下の3つを差し替えれば完了
   ============================================================ */
var GFORM_ID    = "PASTE_FORM_ID_HERE";
var GFORM_MAIL  = "entry.0000000000";   // メールアドレスの質問ID
var GFORM_SRC   = "entry.1111111111";   // どちらですかの質問ID

function reg(ev, target){
  ev.preventDefault();
  var form = ev.target;
  var mail = form.querySelector('input[type=email]').value;
  var src  = (document.body.dataset.src === "moto") ? "元請・工事会社" : "協力業者・職人";

  if (GFORM_ID.indexOf("PASTE") === -1) {
    var body = new URLSearchParams();
    body.append(GFORM_MAIL, mail);
    body.append(GFORM_SRC, src);
    fetch("https://docs.google.com/forms/d/e/" + GFORM_ID + "/formResponse", {
      method: "POST", mode: "no-cors", body: body
    }).catch(function(){});
  } else {
    /* フォーム未設定のあいだの保険。運営あてのメールを開いて取りこぼしを防ぐ */
    var sub = encodeURIComponent("【ゲンバノワ 先行登録】" + src);
    var bod = encodeURIComponent(
      "この内容のまま送信してください。\n\n" +
      "メールアドレス：" + mail + "\n" +
      "区分：" + src + "\n");
    window.location.href = "mailto:nakagawa@tohoku-mikamikizai.co.jp?subject=" + sub + "&body=" + bod;
  }

  form.style.display = "none";
  document.getElementById(target).style.display = "block";
  return false;
}
