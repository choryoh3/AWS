# 02. VPC（仮想ネットワーク）

## 0. なぜ VPC が必要か

サーバー（EC2）やデータベース（RDS）は、**どのネットワークに置くか**で、誰から見えるかが決まります。VPC は、その「敷地」を自分で設計する仕組みです。

- **インターネットから見える場所**（公開）と、**見えない場所**（非公開）を分けられる。
- DB は非公開に置き、アプリとの通信だけを許す。これが最も基本的な防御です。

## 1. 公式ドキュメント

- What is Amazon VPC?: https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html
- Configure subnets: https://docs.aws.amazon.com/vpc/latest/userguide/configure-subnets.html
- Security groups: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html
- Default VPC: https://docs.aws.amazon.com/vpc/latest/userguide/default-vpc.html

## 2. 基本の概念（公式ページの要点）

| 概念                                  | 説明                                                                                     | なぜ大事か                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **VPC**                               | 自分専用の仮想ネットワーク。リージョンごとに作る                                         | 他人のネットワークと完全に分かれる                                       |
| **サブネット**                        | VPC の中の区画。**1 つのアベイラビリティーゾーン（AZ）に属し、複数の AZ にまたがれない** | 冗長化（片方の AZ が止まっても動く）のために、2 つ以上の AZ に分ける     |
| **パブリックサブネット**              | インターネットゲートウェイへの経路（ルート）がある区画                                   | インターネットから届く場所（アプリや踏み台）                             |
| **プライベートサブネット**            | インターネットゲートウェイへの経路が無い区画                                             | インターネットから届かない場所（DB）                                     |
| **ルートテーブル**                    | 通信の行き先の地図                                                                       | 「インターネットへ行く道」があるかを決める                               |
| **インターネットゲートウェイ（IGW）** | VPC とインターネットをつなぐ出入口                                                       | パブリックにしたいときだけ付ける                                         |
| **セキュリティグループ（SG）**        | リソースごとの出入りの許可リスト                                                         | 許可したものだけ通す。**ステートフル**（許可した通信の返事は自動で通る） |
| **ネットワーク ACL（NACL）**          | サブネット単位の出入りのルール                                                           | 学習段階では、既定のままでよい                                           |
| **デフォルト VPC**                    | 各リージョンに最初から用意される VPC                                                     | 学習用に使える（ただし、本番ではカスタム VPC を推奨）                    |

> **要確認**: 簡易版（Sign up for AWS (new)）のプロジェクトに、デフォルト VPC が最初から用意されているかは、実際の画面（VPC のコンソール）で確認してください。無い場合は、この章の手順でカスタム VPC を作ります。

## 3. 設計（作る前に紙に書く）

学習用の最小構成は次のとおりです。

```
VPC: login-app-vpc（例: 10.0.0.0/16）
├─ AZ-a（ここにすべてのサーバーを置く）
│   ├─ public-a   10.0.1.0/24   … 踏み台 EC2 を置く（インターネットへの経路あり）
│   └─ private-a  10.0.11.0/24  … RDS を置く（インターネットへの経路なし）
└─ AZ-b（DB サブネットグループの要件を満たすためだけに作る。中身は空）
    └─ private-b  10.0.12.0/24  … RDS は置かない。サブネットグループの条件用
```

**AZ-a だけでは RDS は作れません（公式の要件）。** RDS のサブネットグループは、**少なくとも 2 つの AZ にそれぞれサブネットがある**ことを要求します（公式ページ「Working with DB subnet groups」）。そのため、次のように割り切ります。

- サーバー（踏み台）と DB の本体は **AZ-a** だけに置く。
- **AZ-b の private-b は「空の要件用サブネット」として 1 つだけ作る。** 料金はかからず、RDS も置かない。
- public-b は作らない（使わないため）。

**なぜこの割り切りか**: 学習の目的は「VPC・踏み台・DB の関係」を理解することです。冗長化（片方の AZ が止まっても動く構成）は、本番で検討すれば十分です。

**なぜ CIDR が `10.0.0.0/16` か**: 家庭のネットワークの `192.168.x.x` と重ならない範囲を選ぶ。将来、他の VPC とつなぐときに重なると困るため。

## 4. 手順 A：VPC を作る（学習用の推奨方法）

**方法 1（おすすめ・初心者向け）：「VPC など」ウィザードを使う**

1. コンソールで **VPC** を開く（リージョンが `ap-southeast-2` になっていることを確認）。
2. **Create VPC（VPC の作成）** → **VPC and more（VPC など）** を選ぶ。
3. 次のように入力する。
   - Name tag auto-generation: `login-app`（タグの接頭語になる）
   - IPv4 CIDR: `10.0.0.0/16`
   - Number of Availability Zones: **2**（DB サブネットグループの要件のため）
   - Number of public subnets: **1**（AZ-a に作られる。踏み台用）
   - Number of private subnets: **2**（AZ-a の DB 用と、AZ-b の要件用）
   - NAT gateways: **None（なし）**（**重要**: NAT Gateway は時間あたりの料金が高く、学習では不要）
   - VPC endpoints: **None**（学習では不要）
   - DNS hostnames: **有効**（オン）
4. **Create VPC** を押す。

**なぜ NAT Gateway を作らないか**: NAT Gateway は、プライベートサブネットから外向きの通信をするための部品です。作ったまま忘れると、使っていなくても料金がかかり続けます。学習では、DB を外に出さないので不要です。

**方法 2（CLI。手順を記録として残したい人向け）**

```bash
REGION=ap-southeast-2   # プロジェクトのリージョンに置き換える

# 1) VPC を作る
VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 --region $REGION \
  --query 'Vpc.VpcId' --output text)
aws ec2 create-tags --resources $VPC_ID --tags Key=Name,Value=login-app-vpc --region $REGION

# 2) DNS の名前解決を有効にする（RDS の接続先名などに必要）
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames --region $REGION
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-support --region $REGION
```

> コンソールの「VPC など」を使うと、サブネットとルートテーブルを一括で作れます。CLI では、サブネットとルートを 1 つずつ作る必要があり、初心者には手間がかかります。**最初はコンソールのウィザードで作り、CLI は後から記録として学ぶ**のがおすすめです。

## 5. 手順 B：インターネットへの経路を確認する（パブリックサブネットの仕組み）

ウィザードで作ると、次が自動で設定されます。確認してみましょう。

1. **VPC → Route tables（ルートテーブル）** を開き、`public` の名前のテーブルを選ぶ。
2. 「Routes（ルート）」タブで、`0.0.0.0/0` の行の Target が **`igw-xxxx`（インターネットゲートウェイ）** になっていることを確認する。
3. `private` の名前のテーブルでは、`0.0.0.0/0` の行が無いことを確認する。

**理解のポイント**: 「パブリック」「プライベート」は、名前ではなく**ルートテーブルの中身**で決まります。`0.0.0.0/0`（すべてのインターネット）への道が、IGW を指しているかどうか。

## 6. 手順 C：セキュリティグループを作る（最重要）

**なぜ 2 つに分けるか**: アプリの踏み台と、DB では、許可する相手が違うからです。「相手を名前（SG）で指定する」と、IP アドレスが変わっても安全なままです。

### SG-1：`sg-bastion`（踏み台 EC2 用）

| 方向                  | ルール                     | 理由                                             |
| --------------------- | -------------------------- | ------------------------------------------------ |
| Inbound（入ってくる） | **なし**                   | SSM Session Manager を使うので、ポートを開けない |
| Outbound（出ていく）  | 既定の「すべて許可」のまま | SSM や、パッケージの更新（dnf）に必要            |

### SG-2：`sg-db`（RDS 用）

| 方向                  | ルール                                            | 理由                         |
| --------------------- | ------------------------------------------------- | ---------------------------- |
| Inbound（入ってくる） | **TCP 5432（PostgreSQL）、送信元 = `sg-bastion`** | 踏み台からだけ DB につなげる |
| Outbound              | 既定のまま                                        | —                            |

**やってはいけない設定**

- `Inbound 0.0.0.0/0 の 5432`（インターネット全体から DB に入れる）
- `Inbound 0.0.0.0/0 の 22`（インターネット全体から SSH できる）

**手順（コンソール）**

1. **VPC → Security groups → Create security group**。
2. 名前 `sg-bastion`、VPC は `login-app-vpc` を選ぶ。Inbound は追加しない。作成。
3. 同じ要領で `sg-db` を作る。Inbound に、Type = PostgreSQL（5432）、Source = `sg-bastion` を追加する。

**CLI**

```bash
VPC_ID=vpc-xxxxxxxx          # 手順 A で作った VPC の ID に置き換える
REGION=ap-southeast-2

BASTION_SG=$(aws ec2 create-security-group --group-name sg-bastion \
  --description "bastion (no inbound)" --vpc-id $VPC_ID --region $REGION \
  --query GroupId --output text)

DB_SG=$(aws ec2 create-security-group --group-name sg-db \
  --description "db: 5432 from bastion only" --vpc-id $VPC_ID --region $REGION \
  --query GroupId --output text)

aws ec2 authorize-security-group-ingress --group-id $DB_SG --region $REGION \
  --protocol tcp --port 5432 --source-group $BASTION_SG
```

## 7. 手順 D：DB 用のサブネットグループを作る（RDS の準備）

RDS を作るときに、「どのサブネットに置いてよいか」を決めるための一覧です。

- **RDS → Subnet groups → Create DB subnet group**。
- 名前: `db-subnets`、VPC: `login-app-vpc`。
- 追加するサブネット: **private-a と private-b**（2 つの AZ。private-b は空のままでよい）。

**なぜ**: 後で RDS を作るとき、この一覧の中からだけ選べるようにするため。公開したくない DB を、うっかり公開サブネットに置かないための仕組みです。

## 8. 運用のポイント

| 項目                   | やること                                         | 理由                                               |
| ---------------------- | ------------------------------------------------ | -------------------------------------------------- |
| SG の変更記録          | 変更の理由を、タグや手順書に書く                 | 半年後に「なぜこの穴があるのか」を説明できるように |
| 開けたポートの定期確認 | 月 1 回、`0.0.0.0/0` のルールが無いかを確認      | 一時的な開放の消し忘れを防ぐ                       |
| タグ                   | `Project=login-app`、`Env=learning` などを付ける | 費用の集計と、後片付けのため                       |

**確認コマンド（開放されているかをチェック）**

```bash
aws ec2 describe-security-groups --region $REGION \
  --filters Name=ip-permission.cidr,Values=0.0.0.0/0 \
  --query 'SecurityGroups[].{Name:GroupName,Id:GroupId}' --output table
```

このコマンドで何も表示されなければ、インターネット全体に開いているルールは無い（ただし、既定の VPC のルールは除く）。

## 9. 後片付け（学習後）

VPC は、中に EC2・RDS などが無ければ、料金はかかりません。ただし、**残すと混乱の元**になるため、次の順で消します。

1. RDS と EC2 を消す（各章を参照）。
2. サブネットグループを消す。
3. セキュリティグループを消す（`sg-db` を先に消し、次に `sg-bastion`）。
4. VPC を消す（コンソールの VPC 削除は、関連するリソースをまとめて消してくれる場合がある。残っていないか確認する）。

## 10. 要確認

1. 簡易版のプロジェクトにデフォルト VPC があるか（VPC のコンソールで確認）
2. 「VPC など」ウィザードの画面の項目名（画面が変わることがある）
