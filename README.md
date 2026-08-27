# 提成设置 · 实验版（独立原型）

从大原型 `card/demo.html` 剥离的 **comm2 实验版提成设置** 模块，可本地独立运行。

## 启动

```powershell
cd D:\RTB打补丁工程\提成设置
python -m http.server 8765
```

浏览器打开：<http://localhost:8765/index.html>

## 深链

| URL | 说明 |
|-----|------|
| `?flow=comm2-list` | 方案列表 |
| `?flow=comm2-edit` | 编辑「顾问标准提成」 |
| `?flow=comm2-pick` | 编辑「资深技师综合方案」并进入添规则项 |
| `?capture=comm2-advisor` | Figma 截图：顾问标准提成编辑页 |
| `?flow=comm2-list&capture=1` | 仅手机框（隐藏左侧导航） |

## 文件

| 文件 | 说明 |
|------|------|
| `index.html` | 左侧链路导航 + 390×844 手机框 |
| `comm2.js` / `comm2.css` | 实验版提成核心（与大原型同源复制） |
| `seed-data.js` | 价目/产品/分组/会员卡/员工池演示数据 |
| `amount-keypad.js` | 金额数字键盘 |
| `PRD-提成设置.html` | PRD 预览 |

## 与大原型关系

- **复制保留**：`card/demo.html` 内 comm2 未删除
- **一次性搬运**：后续各自独立演进
