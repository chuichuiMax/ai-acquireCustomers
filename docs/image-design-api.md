# 生图小程序接口契约

小程序页面 [`pages/cover/cover.vue`](../pages/cover/cover.vue) 使用以下接口。所有接口均要求当前员工登录态，并返回 JSON。

## 现有素材库

图库选择不新建案例库或毛坯库。前端仍调用已有接口读取全部可见文件夹和文件：

- `GET /api/mp/content/galleries?scope=private`
- `GET /api/mp/content/galleries?scope=enterprise`
- `GET /api/mp/content/gallery-items?category={folderId}&scope={visibility}`

【案例图库】和【毛坯图库】只在创建生图图库引用时传递不同的 `source_role`，不改变原素材文件，也不复制原素材。

## 草稿

### `GET /api/mp/image-design/drafts`

返回当前账号跨设备同步的三个工作流草稿：

```json
{
  "drafts": {
    "redesign": {},
    "adapt": {},
    "transfer": {}
  }
}
```

### `PUT /api/mp/image-design/drafts`

请求体为 `{ "drafts": { ... } }`。服务端必须只覆盖当前账号自己的草稿，并保留 JSON 中的图片引用 ID。前端在输入后约 700ms 同步，也会在退出页面时再同步一次。

## 生图专用图库

### `GET /api/mp/image-design/library?page=1&page_size=100`

返回当前账号的已收藏/已上传输入图。每个条目至少包含：

```json
{
  "items": [
    {
      "id": "design-library-item-id",
      "source_item_id": "optional-material-library-item-id",
      "asset_id": "optional-asset-id",
      "file_url": "/media/image.jpg",
      "thumbnail_file_url": "/media/image-thumb.jpg",
      "file_name": "客厅.jpg",
      "source_role": "reference",
      "created_at": "2026-09-17T10:00:00Z"
    }
  ]
}
```

### `POST /api/mp/image-design/library`

将已存在的素材库图片加入生图专用图库。请求：

```json
{
  "source_library_item_id": "material-library-item-id",
  "source_gallery_id": "source-folder-id",
  "source_role": "reference"
}
```

`source_role` 为 `reference` 或 `rough`。服务端需要按账号与原素材 ID 去重，返回已存在或新建的 `item`。成功后，前端会将返回图片填入当前槽位并返回工作流。

### `POST /api/mp/image-design/uploads`

使用 multipart 上传字段 `file`，并带 `role`。上传必须直接写入生图专用图库，不应自动写入普通素材库文件夹。返回上述 `item` 结构，`source_role` 建议为 `upload`。

## AI 润色

### `POST /api/mp/image-design/polish`

请求体：

```json
{
  "workflow": "redesign",
  "description": "暖色木质与阅读角",
  "style": "现代轻奢",
  "images": [{ "role": "source", "library_item_id": "design-library-item-id" }],
  "target_space": "客厅",
  "layout_type": "一字型沙发墙",
  "extra_element": "落地窗旁休闲躺椅"
}
```

返回 `{ "polished_prompt": "..." }`。前端将结果只读展示；用户修改描述后会使该结果失效，必须重新调用此接口。原房换装选择“使用补充描述作为风格提示词”时，同样省略 `style`。

## 异步生成

### `POST /api/mp/image-design/tasks`

请求中包含 `workflow`、角色化 `images`、原始 `description`、`polished_prompt`、`ratio`、`count`（2 或 4）、`quality`（`1k` 或 `2k`）、`save_target_id`，跨空间迁移还包括三个单选参数。

原房换装使用以下预设风格：`现代轻奢`、`意式极简`、`新中式`、`现代法式`、`极简奶油风`、`现代简约`、`侘寂风`、`南洋复古风`、`美式现代`、`日式极简禅风`。若用户选择“使用补充描述作为风格提示词”，前端会省略 `style`，服务端应以 `description` 与 `polished_prompt` 作为风格指令，不得将该展示文案当作风格值校验。

服务端必须验证：图片属于当前账号或当前企业可见范围；保存路径属于当前账号，或为企业允许写入的公共库；`save_target_id` 不得由客户端绕过权限写入任意企业文件夹。成功返回：

```json
{ "task": { "id": "task-id", "status": "queued", "status_text": "正在生成图片…" } }
```

### `GET /api/mp/image-design/tasks/{taskId}`

返回任务状态。状态建议为 `queued`、`running`、`completed`、`failed`、`cancelled`；页面会每 4 秒轮询未完成任务。

### `POST /api/mp/image-design/tasks/{taskId}/retry`

仅补生成失败子任务。成功返回新任务或已重入队的任务对象。

## 生成结果

### `GET /api/mp/image-design/results?page=1&page_size=100`

每个结果需提供结果图、任务 ID、工作流、创建时间和对比源图。户型适配需同时返回参考效果图与毛坯实拍图：

```json
{
  "items": [
    {
      "id": "result-id",
      "task_id": "task-id",
      "workflow": "adapt",
      "image_url": "/media/result.jpg",
      "created_at": "2026-09-17T10:00:00Z",
      "reference_image": { "file_url": "/media/reference.jpg" },
      "rough_image": { "file_url": "/media/rough.jpg" },
      "failed_count": 0,
      "can_retry": false
    }
  ]
}
```

生成成功的每张图必须同时写入 `save_target_id` 指向的个人文件夹或企业公共库，并永久保留在此结果列表中。写入公共库后立即可见。
