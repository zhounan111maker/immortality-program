# archive/

这个目录用于存放**单文件归档版本**的可选副本。

## 它是做什么的

`pnpm run archive` 会在项目根目录生成：

```
dist-archive/immortality-program-archive.html
```

那是一个**自包含**的 HTML 文件：CSS 与 JavaScript 全部内联，无外部依赖。
双击即可在任意现代浏览器中打开，不需要服务器、不需要联网。

## 为什么还保留一个 public/archive/

主站部署在 Vercel 上，而托管服务没有永久保证。
把一个归档快照放进 `public/archive/` 后，它会被一起部署，
于是你可以通过这样一个稳定地址引用某个特定时间点的完整站点：

```
https://<你的域名>/archive/immortality-program-v1.0.0.html
```

这个地址适合：

- 写进论文、预印本或引用条目里，作为一个不会随主站改版而变化的版本快照
- 上传到 Arweave / IPFS 等永久存储时的输入文件
- 交给需要「离线带走一份」的读者

`vercel.json` 的 SPA 回退规则已经把 `/archive/` 排除在外，
因此这里的 HTML 文件会被当作真实文件直接提供，不会被路由回退吞掉。

## 如何使用

```bash
# 1. 生成归档版
pnpm run archive

# 2. 复制进来并起一个带版本号的名字
copy dist-archive\immortality-program-archive.html public\archive\immortality-program-v1.0.0.html

# 3. 重新构建并部署
pnpm build
```

## 注意

- 归档文件是**静态快照**。主站后续的修订不会反映到已归档的文件里 ——
  这是刻意的：归档的意义就在于它记录的是某个确定版本。
- 版本号请与协议版本或站点发布版本对应，便于引用时说明。
- 这个目录目前是空的。**尚未执行任何 Arweave 上传**，也还没有归档快照 ——
  「架构与部署」页已如实标注这一点。
