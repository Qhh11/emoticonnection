# 快速启动指南

## 🚀 一键启动

```bash
cd /Users/lyr22ryl/emoticonnection/frontend
npm run dev
```

打开浏览器访问: **http://localhost:3000/**

## 📝 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 (端口 3000) |
| `npm run build` | 生产构建 |
| `npm run preview` | 预览生产版本 |
| `npm install` | 安装依赖 |

## 📁 关键文件位置

- **Landing 页面**: `src/pages/Landing.tsx`
- **UI 组件**: `src/components/ui/`
- **设计系统**: `tailwind.config.js`
- **Mock 数据**: `src/data/mockData.ts`
- **全局样式**: `src/index.css`

## 🎨 修改设计

### 修改颜色
编辑 `tailwind.config.js` 的 `colors` 部分

### 修改字体大小
编辑 `tailwind.config.js` 的 `fontSize` 部分

### 修改间距
编辑 `tailwind.config.js` 的 `spacing` 部分

## 🔧 添加新页面

1. 在 `src/pages/` 创建新页面组件
2. 如需路由，安装 React Router:
   ```bash
   npm install react-router-dom
   ```
3. 在 `App.tsx` 中配置路由

## 📦 项目已包含

- ✅ React 18.3 + TypeScript
- ✅ Tailwind CSS 3.4
- ✅ Lucide React 图标
- ✅ 5个可复用 UI 组件
- ✅ 完整 Landing 页面
- ✅ Mock 数据结构
- ✅ 纸感背景 + 几何装饰

## 📖 详细文档

查看 `README.md` 了解更多细节。
