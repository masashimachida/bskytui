# bskytui

A terminal UI client for Bluesky, built with Ink.

**usage**

```sh
$ npm run build
$ npm start
```

## 設定ファイル

`~/.config/bskytui/config.yaml`(`$XDG_CONFIG_HOME`が設定されていればそちらを優先)に置くと、キーバインド・表示・動作をカスタマイズできる。ファイルが存在しない場合は全項目デフォルト値で動作する。

```yaml
keymap:
  like: f
  repost: R
  reply: r
  compose: n
  quote: q
  help: "?"
  switchTimeline: "1"
  switchNotifications: "2"
  switchFeeds: "3"
  switchProfile: "4"
  openLink: o
  openPost: O
  viewImage: i
  viewAuthor: u
  delete: d
  back: h
  listUp: k
  listDown: j
  listTop: g
  listBottom: G

display:
  showImages: true
  dateFormat: relative   # relative(相対時刻) | absolute(絶対時刻)
  imageMaxWidth: 30       # サムネイル画像の最大幅(列数)
  imageExpand: selected   # never(常に非展開) | selected(選択中の投稿のみ自動展開) | always(常時展開)

behavior:
  confirmDelete: true
```

- `keymap`は1文字キーの再割当てのみ対応。矢印キー・Enter・Escapeは固定。
- 未記載の項目はデフォルト値を使用する。
- 型が不正な値・キーの重複割り当てがある場合、該当項目のみデフォルト値にフォールバックし、標準エラー出力に警告を表示する。
- `imageExpand: always`はターミナル(特にWezTerm)によっては再描画時に画像消失・文字欠損が起きることがある。スクロール直後に一時的に画像を隠す対策で大幅に軽減しているが、低頻度(使っているとたまに見る程度)で残る既知の制約。根本原因はink-picture(依存ライブラリ)の直接描画方式とInkの描画パイプラインの構造的な不整合にあり、bskytui側では完全に解消できない。
