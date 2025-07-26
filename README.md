# Airplay Canvas

Shairport Syncが出力するAirPlayメタデータを監視して、アーティスト名や楽曲名をスクリーンに表示する

## プロジェクト概要

このプロジェクトは、[Shairport Sync](https://github.com/mikebrady/shairport-sync)が標準出力に出力するAirPlayメタデータをリアルタイムで解析し、楽曲情報（アーティスト名、楽曲名）をフレームバッファー経由でスクリーンに表示するためのプログラムです。

### 主な機能

- **リアルタイムメタデータ解析**: Shairport SyncのXML形式メタデータを解析
- **インテリジェントな待ち合わせ**: アーティスト名と楽曲名の両方が揃うまで最大3秒待機
- **Canvas描画**: Node.js Canvasを使用した高品質な文字描画
- **複数スクリーン対応**: フレームバッファー
- **TypeScript**: 型安全な開発環境

## 前提条件

- Node.js (v16以上推奨)
- npm
- Shairport Sync (メタデータ出力設定済み)
- Linux環境
- システム依存ライブラリ（Cairo, Pango等）

### システム依存関係のインストール

#### Ubuntu/Debian
```bash
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

#### 試験用: macOS (Homebrew)
```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman
```

## インストール

```bash
git clone https://github.com/minoruta/airplay-canvas.git
cd airplay-canvas
npm install
```

## 使用方法

### 基本的な使用方法

```bash
# Shairport Syncからのメタデータをパイプで渡す
npm run start < /tmp/shairport-sync-metadata
```

### cron設定例

```crontab
@reboot sleep 10 && cd /home/player/airplay-canvas && /home/player/.nvm/versions/node/v22.17.1/bin/node dist/index.js < /tmp/shairport-sync-metadata >> /home/player/airplay-canvas.log 2>&1
```

### 開発モード

```bash
# サンプルデータでテスト実行
npm run dev
```

## 設定オプション

### 環境変数

- `FB_DEVICE`: フレームバッファのデバイス名 (デフォルト: '/dev/fb0')
  - `FB_DEVICE=''` と指定した時は、フレームバッファではなくファイルに出力します。
- `SCREEN_WIDTH`: スクリーン幅（デフォルト: 320）
- `SCREEN_HEIGHT`: スクリーン高さ（デフォルト: 240）

## 技術仕様

### データフロー

1. **メタデータ受信**: Shairport SyncからXML形式のメタデータを受信
2. **解析**: `@minoruta/parse-shairport`ライブラリでパース
3. **フィルタリング**: アーティスト名(`artist`)と楽曲名(`title`)のみを抽出
4. **待ち合わせ**: 両方の情報が揃うまで最大3秒待機
5. **描画**: Canvasライブラリで文字を描画
6. **出力**: 指定されたフレームバッファに出力

### 使用ライブラリ

- **[@minoruta/parse-shairport](https://github.com/minoruta/parse-shairport)**: Shairport Syncメタデータ解析
- **[canvas](https://www.npmjs.com/package/canvas)**: Node.js Canvas API
- **[RxJS](https://rxjs.dev/)**: リアクティブプログラミング
- **TypeScript**: 型安全な開発

## 開発

### スクリプト

- `npm run build` - TypeScriptをJavaScriptにコンパイル
- `npm run start` - コンパイル済みのJavaScriptを実行
- `npm run dev` - サンプルデータでTypeScript直接実行
- `npm run clean` - distディレクトリを削除

## トラブルシューティング

### Canvas関連エラー

macOSでnode-canvasのインストールに失敗する場合：

```bash
export PKG_CONFIG_PATH="/opt/homebrew/lib/pkgconfig:$PKG_CONFIG_PATH"
npm install canvas
```

### 古いNodeバージョンへの対応

Volumio OS等のNodeバージョンが低い(14)時は、node-canvasのバージョンを落として見てください。
```sh
% npm i canvas@2.10.1    
```

## 関連プロジェクト

- [Shairport Sync](https://github.com/mikebrady/shairport-sync) - AirPlayオーディオプレーヤー
- [shairport-sync-metadata-reader](https://github.com/mikebrady/shairport-sync-metadata-reader)
- [parse-shairport](https://github.com/minoruta/parse-shairport) - Shairport Syncメタデータ解析ライブラリ
