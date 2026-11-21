# AWS 入門ハンズオン（簡易版 Sign up for AWS (new) から始める）

本番環境の作成は、すべて人間が行う。AWS の画面は頻繁に変わるため、細部は公式ページで確認すること。

## 0. 公式ドキュメント（最初に読む）

- Sign up for AWS (new) — 新しいサインアップの流れ（Builder ID の扱いを含む）
  https://docs.aws.amazon.com/accounts/latest/reference/sign-in-new.html
- Compare sign-up options — 簡易版と通常版（advanced）の比較
  https://docs.aws.amazon.com/accounts/latest/reference/sign-up-for-aws.html
- Supported AWS services for Sign up for AWS (new) — 簡易版で使えるサービスの一覧
  https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html
- AWS Regions for your projects — リージョンの決まり方
  https://docs.aws.amazon.com/accounts/latest/reference/project-regions.html
- Create a spend limit in AWS Settings — 利用上限の仕様
  https://docs.aws.amazon.com/accounts/latest/reference/create-spend-limit.html

> 上の公式ページは、この環境から読んで内容を確認しました（2026 年 11 月時点）。画面の名称は今後変わる可能性があります。

## 1. 簡易版と通常版の違い（公式ページで確認した内容）

| 項目                    | 簡易版（new）                                                                                                        | 通常版（advanced）    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------- |
| サインイン              | Google / GitHub / Apple / Amazon のいずれかの既存ログイン                                                            | 通常のアカウント作成  |
| 管理者の ID             | **AWS Builder ID** がプロジェクトを所有する。**ルートユーザーは作られない**                                          | ルートユーザー        |
| 構成の単位              | **プロジェクト**（中に AWS アカウントが 1 つ入る）。設定は **AWS Settings** で行う                                   | アカウント            |
| リージョン              | **選べない**。連絡先の国に応じて、us-east-2・ap-southeast-2・eu-north-1 のいずれかに自動で決まる                     | 任意に選べる          |
| IAM                     | IAM ユーザー・ロールは作れるが、**プログラムからのアクセスにしか使えない**（コンソールには入れない）                 | 通常どおり            |
| IAM Identity Center     | 自動で有効になる                                                                                                     | 手動で有効化          |
| 利用上限（spend limit） | **有料プランでのみ作れる**。最低額は $20 か、それ以上の見積もり額                                                    | 予算（Budgets）で管理 |
| サービス                | Free Tier の対象サービスは広い（EC2・RDS・SES・Amplify・Budgets・IAM・Secrets Manager などを含む）。一部機能は非対応 | 全サービス            |
| マルチリージョン        | 非対応                                                                                                               | 対応                  |

> **AWS Builder ID について**: サインインに使う個人の ID です。このプロジェクトの持ち主になる、という位置づけです。作成と管理の手順は、上の「Sign up for AWS (new)」に従ってください。

## 2. サインアップと安全設定

1. 上の「Sign up for AWS (new)」の手順で、Google などのログインを使ってサインアップする。名前・メールの確認・パスワード・連絡先（国）の入力が続く。
2. 連絡先の国によって、リージョンが決まる（日本の場合は、アジア太平洋の Sydney（ap-southeast-2）になる見込み。**必ず AWS Settings の Project 画面で確認する**）。
3. **MFA（多要素認証）を登録する。** AWS Settings で登録する（手順は「Manage multi-factor authentication (MFA) in AWS Settings」に従う）。
4. **利用上限を設定する（有料プランが必要）。** 有料プランへのアップグレードは AWS Settings で行う。利用上限は $20 以上で作れる。上限に達すると**プロジェクトのリソースが停止される**ので、学習中に止まっても困らないかを考えてから設定する。通知は 50%・75%・90% で届く。
5. **予算（Budgets）も作る。** 「AWS Budgets」は簡易版の対応サービスに含まれている。利用上限とは別に、早めの通知として月額の予算を作る。

## 3. CLI でサインインする

簡易版では、CLI から直接サインアップ・サインインできる。

```bash
aws signup            # AWS CLI 2.41.0 以降。ブラウザでサインアップが開く
aws login             # すでに作成済みのプロジェクトに、CLI でサインインする（2.32.0 以降）
aws sts get-caller-identity          # 自分のプロジェクトのアカウント ID が表示されれば接続 OK
aws configure list                   # 設定されているリージョンを確認する
```

リージョンが想定と違うときは、次のように合わせる（`project-region` はプロジェクトのリージョン）。

```bash
aws configure set region ap-southeast-2
```

## 4. ストレージ（S3）を触る

1. バケットを作る（名前は世界で一意）。**パブリックアクセスは「すべてブロック」のまま。**
2. ファイルをアップロードし、バージョニングを有効にして、上書きしたときの動きを確かめる。
3. CLI でも操作する: `aws s3 cp ./test.txt s3://<バケット名>/`

## 5. 権限（IAM）を理解する

1. ポリシー（JSON）を読み、「どの操作をどのリソースに許すか」を説明できるようにする。
2. 簡易版では、IAM ユーザーは**プログラムからのアクセス**に限られる。コンソールの権限ではなく、ロールとポリシーの読み方を学ぶ。
3. 最小権限の原則: 必要な操作だけを許すポリシーを作って、CLI で確かめる。

## 6. ネットワーク（VPC）とサーバー（EC2）

1. 既定の VPC、サブネット、セキュリティグループの役割を確認する。
2. 小さなインスタンス（t3.micro または t4g.micro）を起動する。Free Tier の対象で、簡易版の対応サービスに含まれる。
3. 接続は SSH より **Session Manager** を使う（ポートを開けずに済む）。
4. **使い終わったら停止、または削除する。** 停止しても EBS などの料金は残る。

## 7. データベース（RDS for PostgreSQL）

1. RDS（PostgreSQL 16 系）を作る。学習用は小さなクラス（db.t4g.micro）で、パブリックアクセスは「なし」。対応サービスに含まれる。
2. EC2 から `psql` で接続し、テーブルを作って確かめる。
3. **学習が終わったら削除する。** 放置すると、利用上限の対象として料金が積み上がる。

## 8. メール送信（SES）

このアプリの認証コードは SES の SMTP で送る（`SMTP_HOST=email-smtp.<リージョン>.amazonaws.com`、587 番）。SES は対応サービスに含まれる。ただし、**Deliverability dashboard は非対応**。

1. SES で送信元のメールアドレス（または独自ドメイン）を **検証** する。リージョンはプロジェクトのリージョン（例: ap-southeast-2）に合わせる。
2. 「SMTP 設定」で SMTP 認証情報を作る。**秘密情報。** Git や環境変数の平文欄には入れず、Secrets Manager か Amplify のシークレットに置く。
3. SES の送信制限（サンドボックス）の扱いは、SES のドキュメントで確認する（検証済みの宛先にしか送れない状態が既定）。
4. 送信テスト後、受信箱（迷惑メールも含む）で確認する。

## 9. アプリを公開する（最初の 1 回）

学習用の第一候補は **AWS Amplify Hosting**（Git リポジトリを接続し、Next.js の SSR を扱える）。Amplify は対応サービスに含まれる。

1. GitHub リポジトリを Amplify に接続し、`apps/web` を対象にする。
2. 環境変数を設定する（`docs/setup.md` の一覧。`BETTER_AUTH_URL` は公開 URL に変える）。
3. 秘密の値（`BETTER_AUTH_SECRET`、`SMTP_PASS`、`DATABASE_URL`）はシークレットとして登録する（Secrets Manager も対応サービス）。
4. 本番の DB に接続する前に、マイグレーションを `pnpm --filter @app/db db:migrate` で適用する（接続先を本番の値にして、人間が実行する）。

## 10. 後片付けチェックリスト

- [ ] EC2 を停止・削除した
- [ ] RDS を削除した（スナップショットの要否も確認）
- [ ] 使っていない S3 バケット・Elastic IP・NAT Gateway を削除した（NAT Gateway は放置すると高額）
- [ ] AWS Settings の Billing で、今月の利用額と利用上限の残りを確認した
- [ ] 予算アラートと利用上限の通知メールが届くことを確認した

## 残っている確認事項

1. MFA の登録手順の細部（AWS Settings の画面）
2. SES の送信制限（サンドボックス）の解除手順（SES のドキュメント）
3. 日本の連絡先から割り当てられるリージョン（AWS Settings で確認）
