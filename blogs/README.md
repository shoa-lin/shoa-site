# 博客目录

这个目录存放你的个人博客文章（Markdown 格式）。

## 如何添加新博客

### 步骤 1：创建 Markdown 文件

在 `blogs/` 目录下创建新的 `.md` 文件，例如 `my-first-post.md`：

```markdown
---
title: 我的第一篇博客
date: 2025-12-29
---

# 我的第一篇博客

这是正文内容...
```

### 步骤 2：更新 manifest.json

在 `blogs/manifest.json` 中添加新文章的元数据：

```json
[
    {
        "id": "welcome",
        "title": "欢迎来到我的博客",
        "date": "2025-12-28",
        "filename": "blogs/welcome.md"
    },
    {
        "id": "my-first-post",
        "title": "我的第一篇博客",
        "date": "2025-12-29",
        "filename": "blogs/my-first-post.md"
    }
]
```

### 步骤 3：提交到 GitHub

```bash
git add blogs/
git commit -m "添加新博客"
git push
```

---

## 注意事项

1. **id**: 唯一标识符，使用英文，不含特殊字符
2. **title**: 文章标题，会显示在侧边栏列表
3. **date**: 发布日期，格式 `YYYY-MM-DD`
4. **filename**: MD 文件的相对路径（以 `blogs/` 开头）

## Frontmatter（可选）

MD 文件可以使用 YAML frontmatter 指定标题和日期：

```markdown
---
title: 这个标题会覆盖 manifest 中的标题
date: 2025-12-29
---

正文...
```

如果不指定 frontmatter，会自动使用 MD 文件中的第一个 `# 标题` 作为文章标题。
