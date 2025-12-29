# Favorites 文章收藏夹

这个目录用于存放收藏的文章（Markdown格式），网站会自动从这里读取并展示文章。

## 目录结构

```
favorites/
├── articles/              # 存放所有文章的 Markdown 文件
│   ├── manus-meeting.md  # 示例文章
│   └── ...               # 你的其他文章
├── manifest.json         # (可选) 文章清单文件
└── README.md            # 本文件
```

## 如何添加新文章

### 方法一：直接添加 MD 文件（推荐）

1. 将你的 Markdown 文件放入 `articles/` 文件夹
2. 在 `script.js` 的 `getDefaultArticleList()` 函数中添加文章元数据：

```javascript
function getDefaultArticleList() {
    return [
        {
            id: 'manus-meeting',                    // 唯一标识符（英文，无空格）
            title: '回看过去：Manus 立项会议纪要',   // 文章标题
            author: '潜云思绪',                      // 作者
            date: '2025-12-27',                     // 发布日期
            source: '微信公众号',                    // 来源名称
            sourceType: 'wechat',                   // 来源类型: wechat/blog/paper/other
            sourceUrl: 'https://mp.weixin.qq.com/...', // 原文链接
            excerpt: '文章摘要...',                  // 简短摘要（100字内）
            tags: ['AI Agent', '产品设计'],         // 标签数组
            mdFile: 'favorites/articles/manus-meeting.md' // MD 文件路径
        },
        // 在这里添加更多文章...
    ];
}
```

### 方法二：使用 manifest.json（可选）

如果文章很多，可以创建 `manifest.json` 文件来统一管理：

```json
[
    {
        "id": "manus-meeting",
        "title": "回看过去：Manus 立项会议纪要",
        "author": "潜云思绪",
        "date": "2025-12-27",
        "source": "微信公众号",
        "sourceType": "wechat",
        "sourceUrl": "https://mp.weixin.qq.com/s/Ud0djNpSAqUoFUYpTzasmg",
        "excerpt": "一个旨在重新定义智能体、致力于成为人类强大心智延伸的探索之旅，由此正式启航。",
        "tags": ["AI Agent", "产品设计", "技术架构"],
        "mdFile": "favorites/articles/manus-meeting.md"
    }
]
```

## 来源类型 (sourceType)

| 值 | 显示名称 | 图标 |
|---|---|---|
| `wechat` | 微信公众号 | |
| `blog` | 博客 | |
| `paper` | 论文 | |
| `other` | 其他 | |

## 注意事项

1. **文件路径**：`mdFile` 必须使用相对于网站根目录的完整路径，如 `favorites/articles/文件名.md`
2. **ID 唯一性**：每篇文章的 `id` 必须唯一，用于标识和加载文章
3. **Markdown 格式**：文章文件使用标准 Markdown 格式，支持标题、列表、代码块等
4. **版权声明**：网站会自动在文章底部显示来源、原文链接和版权声明

## 快速开始

```bash
# 1. 将新文章复制到 articles 文件夹
cp /path/to/your/article.md favorites/articles/

# 2. 在 script.js 中添加元数据
# 编辑 script.js 的 getDefaultArticleList() 函数

# 3. 刷新网站查看效果
```
