# AWS 入門ハンズオン（入口）

AWS の手順は、初心者向けに章ごとに分けて `docs/aws/` にまとめました。

**まずは [docs/aws/README.md](./aws/README.md) を開いてください。** 読む順番、学習の進め方、用語の確認先が書かれています。

| 章                | ファイル                                                        | 内容                                                     |
| ----------------- | --------------------------------------------------------------- | -------------------------------------------------------- |
| 概要・用語集      | [docs/aws/00-overview.md](./aws/00-overview.md)                 | 全体像、作る順番、用語集                                 |
| アカウント・費用  | [docs/aws/01-account-and-cost.md](./aws/01-account-and-cost.md) | 簡易版、MFA、利用上限、予算、リージョン                  |
| VPC               | [docs/aws/02-vpc.md](./aws/02-vpc.md)                           | 仮想ネットワーク、サブネット、セキュリティグループ       |
| EC2               | [docs/aws/03-ec2.md](./aws/03-ec2.md)                           | 仮想サーバー、SSM Session Manager での接続               |
| S3                | [docs/aws/04-s3.md](./aws/04-s3.md)                             | ファイル保存、公開設定、バージョニング                   |
| RDS（PostgreSQL） | [docs/aws/05-rds-postgresql.md](./aws/05-rds-postgresql.md)     | データベースの作成、接続、バックアップ                   |
| SES               | [docs/aws/06-ses.md](./aws/06-ses.md)                           | メール送信、SMTP 認証情報、DNS 設定、サンドボックス解除  |
| 運用              | [docs/aws/07-operations.md](./aws/07-operations.md)             | 毎週・毎月の作業、監視、バックアップ、障害対応、後片付け |

**本番環境の作成は、すべて人間が行ってください。** 画面の名称は変わることがあるため、各章の「公式ドキュメント」と「要確認」の項目を必ず確かめてください。
