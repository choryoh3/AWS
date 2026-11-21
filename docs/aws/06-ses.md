# 06. SES（メール送信）

## 0. なぜ SES を使うか

このアプリは、ログイン時に **6 桁の認証コードをメールで送ります**。

自分たちのサーバーからメールを直接送る（自前の SMTP サーバー）と、次の問題が起きやすいです。

- 送信元の評判（レピュテーション）が低いと、迷惑メール扱いになる。
- 送信元の IP が、迷惑メールの業者と同じだと、ブロックされる。
- 送信量が増えたとき、スパム対策（DKIM・SPF・DMARC など）を自分で管理する手間が大きい。

**SES（Simple Email Service）は、これらの仕組みを AWS が用意しているメール送信サービス**です。アプリは、SMTP（メールの送信方式）で SES に渡すだけです。

## 1. 公式ドキュメント

- Verified identities（検証済みの送信元）: https://docs.aws.amazon.com/ses/latest/dg/verify-addresses-and-domains.html
- SMTP 認証情報の作成（IAM）: https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html
- SMTP 接続の設定（ポートと暗号化）: https://docs.aws.amazon.com/ses/latest/dg/smtp-connect.html
- Easy DKIM: https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dkim-easy.html
- Request production access（サンドボックスの解除）: https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html
- SES deliverability（配信の分析）: https://docs.aws.amazon.com/ses/latest/dg/vdm-ses-deliverability.html

> **公式ドキュメントの注意**: 公式の SMTP のページでは、**Mail Manager SMTP が推奨**されています。本ガイドは、**IAM ユーザーの SMTP 認証情報**を使う方法で説明します。どちらでも、アプリ側の設定（ホスト・ポート・ユーザー名・パスワード）は同じ形式です。作成時の画面で、推奨の方法が表示されていれば、そちらを選んでも構いません（その場合、手順の画面名が変わります）。

## 2. 基本の概念

| 用語                                  | 意味                                                                             | なぜ大事か                                   |
| ------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------- |
| **検証済みの ID（Identity）**         | 送信元として使ってよい、ドメインまたはメールアドレス                             | 送信元を偽れないようにする仕組み             |
| **サンドボックス**                    | 最初の制限付きモード。検証済みの宛先にしか送れない（1 日 200 通、1 秒 1 通まで） | 新規アカウントの悪用を防ぐため               |
| **本番アクセス（Production access）** | サンドボックスの解除。どの宛先にも送れる                                         | 実際のユーザーに届けるため                   |
| **SMTP 認証情報**                     | SES に送るためのユーザー名とパスワード                                           | **AWS のアクセスキーとは別物**（公式の記載） |
| **SMTP エンドポイント**               | 送信先のホスト名（例: `email-smtp.ap-southeast-2.amazonaws.com`）                | **リージョンごとに違う**                     |
| **STARTTLS（587 番）**                | 平文で接続してから、暗号化に切り替える方式                                       | 学習で使う基本の方式                         |
| **TLS Wrapper（465 番）**             | 最初から暗号化して接続する方式（SMTPS）                                          | 587 が使えない場合の代わり                   |
| **DKIM**                              | メールに電子署名を付ける仕組み。DNS に公開鍵を登録する                           | 「本当にこのドメインから送った」と証明する   |
| **SPF**                               | 送信してよいサーバーの一覧を DNS に書く仕組み                                    | なりすましを防ぐ                             |
| **DMARC**                             | SPF と DKIM の結果を、受信側がどう扱うかの方針                                   | 偽装メールへの対応を決める                   |
| **バウンス**                          | 届かなかったメールの戻り                                                         | 宛先が間違っている、などの原因が分かる       |
| **苦情（Complaint）**                 | 受信者が「迷惑メール」として報告したもの                                         | 苦情が多いと、送信を止められることがある     |

## 3. 設計の考え方

- **送信元**: `no-reply@<自分のドメイン>` のように、**ドメインごと**に検証する。個人のアドレスを送信元にしない。
- **SMTP 認証情報**: アプリ専用に 1 組作る。**秘密の値**なので、Secrets Manager か、アプリ基盤のシークレットに置く。
- **送信量**: ログイン 1 回につき 1 通。少量なので、サンドボックス解除後も、料金は小さい（料金ページで確認）。
- **配信の監視**: 後述の通知（バウンス・苦情）を受け取る。

## 4. 手順 A：リージョンを確認する

- SES のコンソールは、**リージョンごと**に設定が分かれている。画面右上のリージョンが `ap-southeast-2`（プロジェクトのリージョン）になっていることを確認する。
- **なぜ**: 検証・SMTP 認証情報・サンドボックスの状態は、すべてリージョンごとに決まるため。別のリージョンで作ると、アプリから接続できない。

## 5. 手順 B：送信元のドメインを検証する（推奨）

### 5.1 なぜドメインか

- メールアドレス 1 つを検証するより、**ドメインを検証すると、そのドメインのどのアドレスからでも送れる**。
- DKIM の署名も、ドメイン単位で付けられる。迷惑メール対策として、効果が高い。
- 自分のドメインを持っていない場合は、**まずメールアドレスで練習**し（5.4）、後でドメインを取得して検証する。

### 5.2 ドメインを検証する

1. SES コンソール → **Identities（ID）** → **Create identity**。
2. Identity type: **Domain**。Domain: `example.com`（自分のドメイン）。
3. **Use Easy DKIM（Easy DKIM を使う）** にチェック。Key length は **RSA_2048**（既定）。
4. **Create identity**。

**Easy DKIM とは**: SES が、2048 ビットの鍵を作り、メールに自動で署名する仕組み（公式の記載）。

### 5.3 DNS に記録を追加する

SES の画面に、次のような記録が表示されます（値は画面に出たものを使う）。

| 種類                | 名前（例）                    | 目的                                             |
| ------------------- | ----------------------------- | ------------------------------------------------ |
| CNAME（DKIM）× 3    | `xxxx._domainkey.example.com` | DKIM の署名を確認するため（SES が 3 つ発行する） |
| TXT（ドメイン確認） | `_amazonses.example.com`      | ドメインの所有を確認するため                     |

- **Route 53 を使っている場合**: SES の画面で「Publish DNS records to Route 53」を押すと、自動で追加される（公式の記載）。
- **他の DNS（お名前.com など）を使っている場合**: 表示された記録を、そのサービスの管理画面に手で追加する。

**なぜ DNS か**: 「このドメインの持ち主は自分だ」と、世界中の受信サーバーが確認できるようにするため。

**確認**: SES の Identities の画面で、ステータスが **Verified** になるまで待つ（DNS の反映には、数分〜数時間かかることがある）。

### 5.4 練習用：メールアドレスを検証する（ドメインが無い場合）

1. Identities → **Create identity** → Identity type: **Email address**。
2. 自分のアドレスを入力して作成する。
3. 届いた確認メールのリンクを開く。ステータスが **Verified** になる。

**注意**: 練習用の検証では、**このアドレス宛てにしか送れない**（サンドボックス中）。

**CLI（ドメインの検証）**

```bash
REGION=ap-southeast-2
aws sesv2 create-email-identity --email-identity example.com --region $REGION
aws sesv2 get-email-identity --email-identity example.com --region $REGION \
  --query '{Status:VerificationStatus,DKIM:DkimAttributes.Status}'
```

## 6. 手順 C：SMTP 認証情報を作る

### 6.1 なぜ作るか

アプリは、SES に送信するときに「このアプリは送ってよい」と証明する必要があります。その証明が、**SMTP 認証情報（ユーザー名とパスワード）**です。

### 6.2 コンソールで作る

1. SES コンソール → **SMTP settings（SMTP 設定）** → **Create SMTP credentials**。
2. **IAM user name** を入力する（例: `login-app-ses-smtp`）。
3. **Create user**。
4. **表示される SMTP ユーザー名とパスワードを、その場で保存する**（パスワードは、この画面でしか表示されない）。
   - ユーザー名は、20 文字の英数字。
   - **Download credentials** で CSV として保存し、安全な場所（パスワードマネージャーなど）に移す。CSV は、Git に入れない。

**コンソールが自動で作るもの**: SES の送信だけを許可した IAM ユーザーと、そのポリシー。ここで**管理者権限は付かない**ことを確認する。

### 6.3 権限の確認（最小権限）

- IAM → Users → `login-app-ses-smtp` → Permissions。
- 付いているポリシーが、**SES への送信（`ses:SendRawEmail` など）だけ**になっていることを確認する。
- `AdministratorAccess` や `AmazonSESFullAccess` のような、広い権限が付いていたら、外す。

**なぜ**: 万一パスワードが漏れても、被害を「メールの送信」だけに抑えるため。

### 6.4 SMTP 認証情報の注意（公式の記載）

- SMTP 認証情報は、**AWS のアクセスキーや、SES コンソールのログインとは別物**。
- **リージョンごとに作り直す**必要がある。

## 7. 手順 D：接続の設定（ポートと暗号化）

| 方式            | ポート              | 特徴                                 | 使いどころ       |
| --------------- | ------------------- | ------------------------------------ | ---------------- |
| **STARTTLS**    | **587**（おすすめ） | 平文で接続してから暗号化に切り替える | 学習・本番の標準 |
| **TLS Wrapper** | 465                 | 最初から暗号化して接続する           | 587 が使えない時 |
| 25 番           | 25                  | **EC2 から送ると、既定で制限される** | 使わない         |

**公式の注意**: EC2 は、既定でポート 25 の送信が制限されています。**587 を使う**のが推奨です。

**アプリの設定（`apps/web/.env.local` の例）**

```bash
SMTP_HOST=email-smtp.ap-southeast-2.amazonaws.com   # リージョンに合わせる
SMTP_PORT=587
SMTP_SECURE=false                                   # 587 は STARTTLS なので false
SMTP_USER=（コンソールで保存した SMTP ユーザー名）
SMTP_PASS=（コンソールで保存した SMTP パスワード）
MAIL_FROM="Login <no-reply@example.com>"            # 検証済みのドメインのアドレス
```

**なぜ `SMTP_SECURE=false` で 587 なのか**: 587 は STARTTLS と呼ばれる方式で、アプリのライブラリ（nodemailer）は、587 では自動で暗号化に切り替えます。465 番を使う場合だけ `SMTP_SECURE=true` にします。

> **秘密の値の扱い**: `SMTP_USER` と `SMTP_PASS` は、Git に入れない。本番では、Amplify のシークレット機能か、Secrets Manager に置く。

### 7.1 接続テスト（CLI で確かめる）

```bash
# 587 番に接続し、STARTTLS の表示が出るかを確認する（認証の前まで）
openssl s_client -starttls smtp -connect email-smtp.ap-southeast-2.amazonaws.com:587 -crlf
# 「250 STARTTLS」が出たら、接続は成功。Ctrl+C で終了する
```

## 8. 手順 E：サンドボックスで送信テストをする

**サンドボックス中のルール**（公式の記載）

- 送信先は、**検証済みのアドレス**か、SES のメールボックスシミュレーター（`success@simulator.amazonses.com` など）だけ。
- 1 日 200 通まで、1 秒 1 通まで。

**テスト手順**

1. アプリを起動し、ログイン画面で、**検証済みのアドレス**を入力する。
2. 届いた認証コードで、ログインできるか確認する。
3. 届かない場合は、後述の「トラブルシューティング」を見る。

**シミュレーターでのテスト（届かなくても、送信の成功を確かめられる）**

- 宛先に `success@simulator.amazonses.com` を入れると、SES が成功として処理する。
- 迷惑メールや、バウンスの挙動も確かめられる（`bounce@simulator.amazonses.com`、`complaint@simulator.amazonses.com`）。

> シミュレーターのアドレス名は、公式ドキュメント「Using the mailbox simulator」で確認してください。

## 9. 手順 F：本番アクセス（サンドボックスの解除）

公式ページ「Request production access (Moving out of the Amazon SES sandbox)」の要点です。

### 9.1 申請の前に、準備すること

- **送信元のドメインを検証しておく**（5 章）。公式が推奨しており、審査が進みやすくなる。
- **Website URL**（アプリの URL）。まだ無い場合は、公開予定の URL を書く。
- **通知を受け取るアドレス**（最大 4 件）。
- **バウンスと苦情の処理の仕組み**（9.3 で作る）。申請の確認項目に「ある」と答える必要がある。

### 9.2 申請する（コンソール）

1. SES コンソール → **Account dashboard（アカウントダッシュボード）**。
2. 上部の警告「Your Amazon SES account is in the sandbox」で、**View Get set up page** → **Request production access**。
3. 入力する。
   - メールの種類: **Transactional（トランザクション）**（ユーザーの操作に応じて、1 対 1 で送るメール。認証コードはこれ）
   - Website URL、通知先、言語（English / Japanese）
   - 確認項目（「明示的に依頼した人にだけ送る」「バウンス・苦情の処理がある」）にチェック
4. **Submit request**。

**CLI（記録用）**

```bash
aws sesv2 put-account-details \
  --production-access-enabled \
  --mail-type TRANSACTIONAL \
  --website-url https://example.com \
  --additional-contact-email-addresses info@example.com \
  --contact-language JA
```

**審査**

- AWS Support が、**96 時間以内**に最初の回答をする（公式の記載）。
- 情報が足りないと、さらに時間がかかる。
- 審査中は、アカウントの詳細を編集できない。

**承認されたら**: どの宛先にも送れるようになる。ただし、**From に使うアドレス（送信元）は、引き続き検証が必要**（公式の記載）。

### 9.3 バウンスと苦情の処理（申請の前に作る）

**なぜ**: 届かないメールや苦情が増えると、SES が送信を止めることがあるため。早めに気づく仕組みが必要です。

**Configuration set（設定セット）と、通知先（SNS）の作り方**

1. SES → **Configuration sets** → **Create configuration set**。名前: `login-app-config`。
2. その中の **Event destinations（イベントの送信先）** → **Add destination**。
3. イベントの種類: **Bounce（バウンス）**、**Complaint（苦情）**、**Reject**。
4. 送信先: **Amazon SNS**。SNS のトピック（例: `login-app-ses-events`）を作り、自分のメールアドレスを購読する。
5. アプリからの送信時に、このコンフィギュレーションセットを指定する（SMTP ヘッダーの `X-SES-CONFIGURATION-SET`、またはコンソールの既定設定）。

> 公式の「Monitoring using event publishing」で、詳しい設定を確認してください。

### 9.4 「SES deliverability（配信の分析）」について

- 公式の記載では、ダッシュボード（Virtual Deliverability Manager）は、この簡易版では**非対応**。
- 影響: **送信そのものは問題なくできる**。ただし、ISP（受信側のサービス）ごとの配信データと、DNS の推奨（Advisor）は、画面で見られない。
- 代わりにやること:
  - DKIM・SPF・DMARC を正しく設定する（5 章、10 章）。
  - バウンス・苦情の通知（9.3）を受け取り、件数を毎週見る。
  - 送信量の統計は、SES の **Account dashboard** で確認する（非対応の一覧には載っていない。画面で確かめる）。

## 10. DNS の設定（SPF・DMARC）

### 10.1 DKIM

- 5.2 で Easy DKIM を有効にすると、SES が鍵を作り、DNS に CNAME を入れる（5.3）。**これが DKIM。**

### 10.2 SPF（送信してよいサーバーの一覧）

- 送信元ドメインの TXT レコードに、SES の送信元を含める。
- 例（既存の SPF が無い場合）: `v=spf1 include:amazonses.com ~all`
- **注意**: ドメインには、SPF の TXT レコードは**1 つだけ**しか置けない。既存のものがあれば、`include:amazonses.com` を**追記して統合**する。

> SPF の書き方は、公式の「Authenticate email」ページの記載で確認してください（本ガイドの確認時点では、詳細が取得できなかったため、一般的な書き方として記載しています）。

### 10.3 DMARC（方針の宣言）

- `_dmarc.example.com` の TXT レコード。例（まずは監視だけ）: `v=DMARC1; p=none; rua=mailto:dmarc-reports@example.com`
- **なぜ `p=none` から始めるか**: いきなり厳しい設定（`p=reject`）にすると、正当なメールまで止めるおそれがあるため。レポートを見て、段階的に強くする。

## 11. 運用

### 11.1 毎週・毎月の確認

| 作業                                                | 頻度                                  | 理由                                 |
| --------------------------------------------------- | ------------------------------------- | ------------------------------------ |
| バウンス・苦情の件数を見る                          | 毎週                                  | 配信の問題に早く気づくため           |
| 送信量（Account dashboard）を見る                   | 毎週                                  | 想定外の送信（不正利用）に気づくため |
| SMTP 認証情報を、定期的に作り直す（ローテーション） | 年 1 回、または漏えいの疑いがあるとき | 古いパスワードの悪用を防ぐ           |
| DKIM・SPF・DMARC の記録が有効か                     | 毎月                                  | DNS の変更による、認証の失敗を防ぐ   |
| サンドボックスの状態（本番か）                      | 申請後に確認                          | 状態が変わっていないか確かめる       |

### 11.2 SMTP 認証情報のローテーション（作り直し）

**なぜ**: パスワードを定期的に変えると、万一の漏えいの影響を小さくできるため。

1. SES → SMTP settings → **Create SMTP credentials** で、新しいユーザーを作る（既存とは別の名前）。
2. アプリの秘密の値（Secrets Manager や Amplify のシークレット）を、新しい値に更新する。
3. アプリが新しい値で送れることを、テストで確認する。
4. 古いユーザーの**アクセスキーを無効化**し、問題がなければ削除する（IAM → Users）。

**注意**: 手順 2 の前に古いものを消すと、アプリが送れなくなる。順番を守る。

### 11.3 トラブルシューティング

| 症状                              | よくある原因                                                | 対処                                                       |
| --------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------- |
| 認証エラー（535 など）            | SMTP のユーザー名・パスワードの誤り、または別リージョンの値 | リージョンを合わせて、認証情報を作り直す                   |
| 「Email address is not verified」 | 送信元（From）が未検証、またはサンドボックスで宛先が未検証  | 送信元を検証する。宛先を検証するか、本番アクセスを申請する |
| 接続のタイムアウト（EC2 から）    | ポート 25 が制限されている                                  | ポート 587 を使う                                          |
| TLS / STARTTLS のエラー           | ポートと方式の不一致                                        | 587 は `SMTP_SECURE=false`、465 は `SMTP_SECURE=true`      |
| 届くが迷惑メールに入る            | DKIM・SPF・DMARC の未設定                                   | 10 章の DNS 設定を確認する                                 |
| 1 日の上限に達した                | サンドボックスの制限（200 通/日）                           | 本番アクセスを申請する                                     |

### 11.4 やってはいけないこと

- 認証情報を、Git・スクリーンショット・チャットに貼る。
- 同意していない相手にメールを送る（苦情が増え、送信を止められる）。
- 管理者権限を、SMTP 用のユーザーに付ける。

## 12. 後片付け（学習後）

1. 学習用のメールアドレスの検証（Identity）を削除する（使わないなら）。
2. SMTP 用の IAM ユーザーと、そのアクセスキーを削除する（IAM → Users）。
3. Configuration set と、SNS のトピックを削除する（使わないなら）。
4. 本番で使うドメインの検証は、残しておく（再申請が不要になるため）。

## 13. 要確認

1. 簡易版で、SES の Identity・SMTP 認証情報・Configuration set が、すべて作れるか（SES は対応サービス一覧に含まれる）
2. 公式の「Authenticate email」（SPF・DMARC）の詳細（本確認では取得できなかった）
3. Mail Manager SMTP と、IAM ユーザー方式の、この画面での違い（作成時の画面で確認）
4. 送信量の統計（Account dashboard）の、この簡易版での表示
