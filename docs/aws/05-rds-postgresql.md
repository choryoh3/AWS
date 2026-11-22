# 05. RDS for PostgreSQL（データベース）

## 0. なぜ RDS を使うか

このアプリは、ユーザー情報・セッション・認証コードを PostgreSQL に保存します（`packages/db` の Drizzle スキーマ）。

PostgreSQL を EC2 に自分で入れることもできますが、次のような作業を**自分で**やる必要があります。

- OS とデータベースのパッチ更新
- バックアップの取得と、復元の手順
- ディスクの容量管理、障害時の切り替え

**RDS（Relational Database Service）は、これらの一部を AWS が代わりに行う**マネージドサービスです。初心者は RDS から始めるのが安全です。

## 1. 公式ドキュメント

- RDS for PostgreSQL の概要: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html
- DB インスタンスの一時停止: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_StopInstance.html
- DB インスタンスへの接続: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ConnectToPostgreSQLInstance.html
- 自動バックアップ: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html
- DB インスタンスの削除: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_DeleteInstance.html

## 2. 基本の概念

| 用語                                | 意味                                                               | なぜ大事か                                                 |
| ----------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| **DB インスタンス**                 | RDS の DB 1 台                                                     | 料金とサイズの単位                                         |
| **エンジン**                        | データベースの種類（PostgreSQL）                                   | アプリの Drizzle と合わせる（本ガイドは PostgreSQL 16 系） |
| **エンドポイント**                  | DB への接続先の名前（例: `xxxx.ap-southeast-2.rds.amazonaws.com`） | アプリ・踏み台が、この名前に接続する                       |
| **ポート**                          | PostgreSQL の既定は **5432**                                       | セキュリティグループで、この番号だけを許可する             |
| **DB サブネットグループ**           | DB を置いてよいサブネットの一覧（02 章で作成）                     | 公開しないサブネットに DB を置くため                       |
| **パブリックアクセス**              | インターネットから直接つなげるかどうか                             | **本ガイドでは「なし」**                                   |
| **自動バックアップ**                | 毎日の自動バックアップと、保持期間（日数）                         | 誤削除・障害から戻すため                                   |
| **スナップショット**                | ある時点の、手動の保存コピー                                       | 大きな変更の前に取る                                       |
| **削除保護（Deletion protection）** | 誤って削除されるのを防ぐスイッチ                                   | コンソールで作ると、既定で有効になる（公式の記載）         |
| **マスターユーザー**                | DB の最高権限のユーザー                                            | アプリでは使わない（後述）                                 |
| **Multi-AZ**                        | 別の AZ に待機用の DB を置く、冗長化の構成                         | 本番向け。学習では**料金が倍近くなる**ため使わない         |

## 3. 設計の考え方（なぜこの構成か）

```
[インターネット]
     ✕ 直接は届かない（パブリックアクセス「なし」）
          │
[VPC] login-app-vpc
   ├─ public-a：EC2 踏み台（sg-bastion）
   │        │ 5432（sg-db は sg-bastion からだけ許可）
   └─ private-a：RDS（sg-db）　※ private-b は、サブネットグループの要件のための空のサブネット
```

- **DB を非公開に置く**: 外から攻撃されない。
- **踏み台だけが 5432 で入れる**: 02 章のセキュリティグループで、送信元を「踏み台の SG」に限定する。
- **アプリ（Amplify）から DB へ**: 要確認（00 章の注意を参照）。学習段階では、踏み台経由の操作から始める。

## 4. 手順 A：RDS を作る（コンソール）

1. **RDS → Databases → Create database**。
2. **Creation method**: **Standard create（標準作成）**（Easy create ではなく、設定が見える方法を選ぶ）。
3. **Engine**: **PostgreSQL**、**Engine Version**: **16.x**（最新の 16 系）。
4. **Templates（テンプレート）**: 学習なら **Free tier**（表示されている場合）。表示されない場合は **Dev/Test**。
   - **なぜ**: 本番用（Production）の既定値は、Multi-AZ や大きなサイズになり、料金が高くなるため。
5. **Settings（設定）**
   - DB instance identifier: `login-app-db`
   - Master username: `postgres`（既定のまま。アプリ用のユーザーは後で作る）
   - **Credentials management（認証情報の管理）**: **Managed in AWS Secrets Manager（Secrets Manager で管理）** を選ぶ。
     - **なぜ**: パスワードを人間が覚えたり、ファイルに書いたりしなくてよい。Secrets Manager が安全に保管し、必要な時だけ取り出せる。
     - 注意: Secrets Manager は、シークレットごとに料金がかかる（料金ページで確認）。
6. **Instance configuration（インスタンス設定）**
   - DB instance class: **db.t4g.micro**（学習用の小さいサイズ。Burstable）
7. **Storage（ストレージ）**
   - Storage type: **gp3**
   - Allocated storage: **20 GiB**（最小に近い値）
   - **Enable storage autoscaling（ストレージの自動拡張）**: オン。**Maximum storage threshold（上限）は 50 GiB** などに決める。
     - **なぜ**: 上限を決めないと、データが増えた時に、気づかないうちにディスクと料金が増えるため。
8. **Availability and durability（可用性）**: **Do not create a standby instance（待機インスタンスを作らない）**（学習用）。
9. **Connectivity（接続）**
   - Compute resource: **Don't connect to an EC2 compute resource**（後で手動で踏み台と結ぶため）
   - VPC: **login-app-vpc**
   - DB subnet group: **db-subnets**（02 章で作成）
   - **Public access（パブリックアクセス）: No**
   - VPC security group: **既存の `sg-db` を選ぶ**（既定の SG は外す）
   - Availability Zone: 指定しなくてよい
   - Port: **5432**
10. **Database authentication（認証）**: **Password authentication（パスワード認証）**。
11. **Monitoring（監視）**: Enhanced monitoring と Performance Insights は**オフ**（学習では不要で、料金がかかる）。
12. **Additional configuration（追加設定）**
    - Initial database name: `app`（アプリの DB 名に合わせる）
    - **Backup（バックアップ）**: **Backup retention period: 7 日**（学習でも、7 日を推奨。短くするなら 1 日）
    - **Enable automated backups** を有効
    - **Maintenance window（メンテナンス時間）**: 日本の夜中（例: 日本時間 3〜4 時）。UTC 換算に注意。
    - **Deletion protection（削除保護）**: 学習のうちは**オン**（誤削除を防ぐ）。後片付けの時に、オフにしてから消す。
13. **Create database**。作成には数分〜十数分かかる。

**CLI（記録用・例）**

```bash
REGION=ap-southeast-2
aws rds create-db-instance \
  --db-instance-identifier login-app-db \
  --engine postgres --engine-version 16.4 \
  --db-instance-class db.t4g.micro \
  --allocated-storage 20 --storage-type gp3 \
  --max-allocated-storage 50 \
  --master-username postgres \
  --manage-master-user-password \
  --db-name app \
  --db-subnet-group-name db-subnets \
  --vpc-security-group-ids sg-xxxxxxxx \
  --no-publicly-accessible \
  --no-multi-az \
  --backup-retention-period 7 \
  --deletion-protection \
  --region $REGION \
  --tags Key=Project,Value=login-app Key=Env,Value=learning
```

> `--engine-version` は、利用できる版の番号に置き換える（`aws rds describe-db-engine-versions --engine postgres --query 'DBEngineVersions[].EngineVersion'` で一覧を確認）。

## 5. 手順 B：接続先とパスワードを確認する

1. RDS → Databases → `login-app-db` を開く。
2. **Endpoint（エンドポイント）** をメモする（例: `login-app-db.xxxx.ap-southeast-2.rds.amazonaws.com`）。
3. **Port**: 5432。
4. パスワード: **Secrets Manager** に保存されている。Secrets Manager → 対象のシークレット → Retrieve secret value で、その場だけ確認する（**画面の表示は、作業が終わったら閉じる**）。

## 6. 手順 C：踏み台から接続する

**ルート 1（おすすめ）: SSM のポート転送で、手元の PC から接続する**

```bash
# 踏み台（EC2）の ID と、RDS のエンドポイントを指定する
aws ssm start-session \
  --target i-0123456789abcdef0 \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{"host":["login-app-db.xxxx.ap-southeast-2.rds.amazonaws.com"],"portNumber":["5432"],"localPortNumber":["5432"]}' \
  --region ap-southeast-2
```

- このコマンドを実行したままにすると、手元の `localhost:5432` が、RDS につながる。
- 別のターミナルで、`psql -h localhost -p 5432 -U postgres -d app` と入力して接続する。

**ルート 2: 踏み台に入って、その中で `psql` を使う**

```bash
# 踏み台の中で（03 章で psql を入れておく）
psql "host=login-app-db.xxxx.ap-southeast-2.rds.amazonaws.com port=5432 dbname=app user=postgres sslmode=require"
```

**なぜ `sslmode=require` か**: 通信を暗号化するため。RDS の接続は TLS で暗号化できます。**パスワードや データを平文で流さない**ための基本です。

## 7. 手順 D：アプリ用のユーザーを作る（最小権限）

**なぜ**: 最高権限（マスターユーザー）をアプリに渡すと、万一の漏えいで DB 全体が乗っ取られるため。アプリ用には、必要な権限だけを持つユーザーを作ります。

```sql
-- psql で、マスターユーザーとして実行する
CREATE ROLE app_user LOGIN PASSWORD '（強いパスワードを生成して入れる）';

-- アプリの DB に接続できるようにする
GRANT CONNECT ON DATABASE app TO app_user;

-- public スキーマで、テーブルの作成・読み書きを許す
-- （マイグレーションをアプリ用ユーザーで行う学習構成のため。本番では、後述のように分けるのが望ましい）
GRANT USAGE, CREATE ON SCHEMA public TO app_user;
```

**パスワードの扱い**

- 強いパスワードは、ツールで生成する（例: `openssl rand -base64 32`）。
- そのパスワードは、**Secrets Manager** に保存する（平文のファイルに書かない）。
- `DATABASE_URL` の形式: `postgres://app_user:<パスワード>@<エンドポイント>:5432/app?sslmode=require`

> **要確認（アプリのコードについて）**: 現在のアプリ（`packages/db`）の接続設定は `DATABASE_URL` を渡すだけで、`sslmode` を指定していません。RDS に接続する前に、`pg` の SSL の設定（`ssl: { rejectUnauthorized: true }` など）を追加するか、接続文字列に `sslmode=require` を付けることを検討してください。

**本番の考え方（参考）**: マイグレーション（テーブルの作成）は、専用のユーザーで行い、アプリの実行時は読み書きだけのユーザーを使うのが一般的です。学習では 1 つのユーザーにまとめて構いません。

## 8. 手順 E：バックアップを確認する（自動バックアップ）

- RDS → 対象の DB → **Maintenance & backups（メンテナンスとバックアップ）** タブ。
- **Automated backups** が「有効」で、**Backup retention period** が 7 日になっていることを確認する。
- **なぜ**: 自動バックアップは、保持期間の中から任意の時点に**復元**できる。誤って消した時の最後の砦。

**手動スナップショットを取る（大きな変更の前に）**

- RDS → 対象の DB → **Actions → Take snapshot**。
- 名前: `login-app-db-before-<変更内容>-<日付>`。

**なぜ**: スナップショットは、自分の判断で「この時点」を残せるため。自動バックアップは保持期間を過ぎると消えるが、スナップショットは消すまで残る。

## 9. 手順 F：一時停止（Stop）と、その注意

- **Actions → Stop temporarily（一時停止）** で、DB を停止できる。
- **公式の記載**: 停止した DB は、**7 日後に自動で再開される**。
- **停止中も、ストレージの料金はかかる**。インスタンスの料金は止まる。
- 一時停止の時に、スナップショットを一緒に保存するか選べる。

**学習の使い方**

- 数日使わない時は、停止して料金を抑える。
- 7 日を過ぎると自動で起動するため、**「止めたまま忘れる」は避ける**。カレンダーに、再開の日を書いておく。

## 10. 手順 G：削除する（後片付け）

**順番が大事**

1. **削除保護をオフにする**: Modify → Deletion protection のチェックを外して、Apply immediately。
2. **Delete**: Actions → Delete。
3. **Create final snapshot（最後のスナップショット）**: 学習データを残したいなら、チェックを入れる。
4. 確認のため、`delete me` と入力して削除する。

**なぜ最後のスナップショットを取るか**: 削除後は、自動バックアップも消える。後で必要になった時に、スナップショットから戻せるように。

**CLI**

```bash
aws rds modify-db-instance --db-instance-identifier login-app-db \
  --no-deletion-protection --apply-immediately --region $REGION

aws rds delete-db-instance --db-instance-identifier login-app-db \
  --final-db-snapshot-identifier login-app-db-final-$(date +%Y%m%d) \
  --region $REGION
```

**後で確認すること**

- スナップショットが残っていれば、保存料金がかかる。不要なら削除する（RDS → Snapshots）。
- サブネットグループ・セキュリティグループは、DB を消した後で、02 章の手順で消せる。

## 11. 運用

### 11.1 毎週・毎月の確認

| 作業                                       | 頻度                                  | 理由                           |
| ------------------------------------------ | ------------------------------------- | ------------------------------ |
| 自動バックアップが有効か                   | 毎月                                  | 復元できない状態を防ぐ         |
| ストレージの使用量（Free storage space）   | 毎月                                  | 容量不足で DB が止まるのを防ぐ |
| CloudWatch の接続数・CPU                   | 毎月                                  | 異常な負荷に気づくため         |
| マイナーアップデート（メンテナンス）の通知 | 通知が来たら                          | セキュリティ修正を取り込むため |
| パスワードのローテーション（変更）         | 年 1 回、または漏えいの疑いがあるとき | 古いパスワードの悪用を防ぐ     |

### 11.2 CloudWatch アラーム（例）

- **FreeStorageSpace** が 2 GiB 以下になったら通知（容量不足の予兆）。
- **CPUUtilization** が 80% を 15 分以上続いたら通知。
- **DatabaseConnections** が想定より多ければ通知（アプリの接続漏れの予兆）。

### 11.3 復元の練習（月 1 回が理想）

1. スナップショットから、**別の名前で**新しい DB を作る（Restore snapshot）。
2. 接続して、データが読めるかを確認する。
3. 練習用の DB は、確認後に削除する。

**なぜ**: バックアップは「復元できて初めて意味がある」。練習しておけば、本番の事故の時に慌てない。

## 12. 要確認

1. 簡易版で RDS の作成（db.t4g.micro・Standard create・Managed master credentials）が、すべて使えるか
2. Amplify（アプリ）から非公開の RDS に接続する方法（00 章の注意を参照）
3. PostgreSQL 16 の利用可能な版番号（`describe-db-engine-versions` で確認）
