# 生图小程序接口契约

小程序页面 [`pages/cover/cover.vue`](../pages/cover/cover.vue) 使用以下接口。所有接口均要求当前员工登录态，并返回 JSON。

## 现有素材库

图库选择不新建案例库或毛坯库。PC 端在企业共享一级图片图库上配置稳定字段 `image_design_role`：

- `reference`：小程序【案例图库】；
- `rough`：小程序【毛坯图库】；
- `null`：不作为生图固定入口。

该字段与可修改的图库名称无关，只允许配置在企业共享一级图片图库，并且每种非空用途全局唯一。个人【未分类】继续使用系统稳定 ID `uncategorized`。前端调用已有接口读取可见文件夹和文件：

- `GET /api/mp/content/galleries?scope=private`
- `GET /api/mp/content/galleries?scope=enterprise`
- `GET /api/mp/content/gallery-items?category={folderId}&scope={visibility}&include_descendants={boolean}&page={page}&page_size={pageSize}`

小程序按 `parent_id` 层级浏览图库：进入一级或子图库时，默认只请求当前图库直属图片；`/api/mp/content/galleries` 返回的子图库在当前层作为文件夹展示，点击后再进入下一层。只有明确需要汇总后代图片时才传 `include_descendants=true`；【未分类】默认不展开子图库。选择图片后仍只创建生图图库引用并立即填入当前图片槽位，不改变或复制普通素材库原文件。

个人素材入口按图片槽位区分：原房换装的 `source` 使用 PC【我的素材 / 未分类】；户型适配的 `reference`、`rough` 以及跨空间迁移的 `reference` 均进入完整的 PC【我的素材】文件夹树。企业入口仍分别使用【案例图库】与【毛坯图库】。

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

每个草稿的 `description` 保存自由输入的文字，`description_keywords` 保存可删除、自定义的关键词数组。新草稿默认包含“高级质感”“空间合理”“专业空间摄影构图”。当前页面内可以删除默认词；刷新或重新进入页面加载草稿时补回缺失的默认词，并保留已保存的自定义词和描述。普通保存路径更新、模式切换不会补回默认词。旧草稿缺少该字段时初始化默认词，保留原有描述。

润色及生成请求均将关键词用“、”连接，再以“。”拼接自由输入文字，作为接口的 `description`（合计最多 3000 字）；不向这两个接口增加关键词字段。草稿的 `polished_for` 记录该合并文本。修改关键词、描述，或恢复默认词导致合并文本变化时，清除 `polished_prompt`、`polished_for`、`refinement_id`，必须重新润色。默认词齐全且合并文本未变时，重新加载保留有效润色结果。

## 生图专用图库

### `GET /api/mp/image-design/library?page=1&page_size=30`

返回当前账号的已收藏/已上传输入图，以及已经生成成功并同步到 PC 素材库的结果图。每个条目至少包含：

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
      "recognized_roles": ["style_reference"],
      "created_at": "2026-09-17T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 30
}
```

小程序按页追加加载，超过 100 张仍可浏览。`recognized_roles` 仅包含当前账号、同一图片哈希、当前分析 schema 下已完成的真实分析角色；数组非空显示“已识别”，否则显示“未识别”。该汇总标签不代替生成时对具体角色、模型及输入的重新校验。卡片日期使用 `created_at`。

### `DELETE /api/mp/image-design/library/{itemId}`

仅将当前账号的引用标记为隐藏（`hidden_at`）；不删除 PC 素材、图片文件、生成结果或已有任务输入。其他账号不能操作此引用。再次主动选入同一素材可恢复原引用；worker 重试不会让用户已移除的卡片重新出现。部署时通过现有业务表迁移补齐 `hidden_at`。

### `POST /api/mp/image-design/library`

将已存在的素材库图片加入生图专用图库。请求：

```json
{
  "source_library_item_id": "material-library-item-id",
  "source_gallery_id": "source-folder-id",
  "source_role": "reference"
}
```

`source_role` 为 `source`、`reference` 或 `rough`，分别对应原房图、参考效果图和毛坯实拍图。服务端需要按账号与原素材 ID 去重，返回已存在或新建的 `item`。成功后，前端会将返回图片填入当前槽位并返回工作流。

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
  "extra_element": ["落地窗旁休闲躺椅", "壁炉居中"]
}
```

返回 `{ "polished_prompt": "...", "refinement_id": "server-refinement-id" }`。前端将结果只读展示；用户修改描述、风格、输入图片或跨空间参数后会使结果和凭证失效，必须重新调用此接口。原房换装选择“使用补充描述作为风格提示词”时，同样省略 `style`。

`extra_element` 在润色和创建任务时均使用字符串数组，省略时视为 `[]`。请求最多包含两个元素，服务端去除首尾空白并保持顺序去重；非数组、空字符串、未知选项或超过两个元素均返回 422，不会静默截断。单字符串仅用于旧草稿的前端迁移，不再是合法接口请求。

## 保存位置

### `GET /api/mp/image-design/save-targets`

只返回“我的素材”和“企业共享 / 生图图库”两个保存位置，与输入图片的源图库浏览独立：

```json
{
  "scopes": [
    { "scope": "private", "label": "我的素材", "can_write_root": true,
      "folders": [] },
    { "scope": "enterprise", "label": "企业共享", "can_write_root": false, "error": "",
      "folders": [{ "id": "existing-generated-gallery-id", "name": "生图图库", "path": "生图图库", "parent_id": null }] }
  ]
}
```

新草稿和任务使用 `save_target`：个人为 `{ "scope": "private", "gallery_id": null }`；企业为 `{ "scope": "enterprise", "gallery_id": "existing-generated-gallery-id" }`。旧草稿中的其他文件夹和企业根目录不再允许提交，须重新选择。

个人根目录使用独立内部分类 `private-root`，PC 根页直接展示其中图片；保留 `uncategorized` 文件夹及普通历史素材。访问个人根目录时，仅将明确记录 `source=image_design`、`resolved_save_target={scope:private,gallery_id:null}` 的旧根目录生成结果从 `uncategorized` 迁移，并同步引用中的分类。其他素材不移动。迁移后的记录、新生成记录和用户主动移动的记录标记 `save_target_version=2`，避免之后再次迁移或撤销用户主动移动。

企业选项绑定当前唯一、有效、顶层且名为“生图图库”的企业图片图库；没有或重名时该选项禁用并返回原因，不创建替代图库。后端任务入口和 worker 均校验固定目标，小程序新任务携带内部 `mp_fixed_target` 标记；目标失效必须报错，不能回退企业根目录。PC 通用文件夹管理仍保持原有能力。

## 异步生成

### `POST /api/mp/image-design/tasks`

请求中包含 `workflow`、角色化 `images`、原始 `description`、`polished_prompt`、`refinement_id`、`ratio`、`count`（2 或 4）、`quality`（`1k` 或 `2k`）、`save_target`，跨空间迁移还包括目标空间、布局类型和附加元素数组。附加元素最多选择两个，`extra_element` 使用字符串数组格式；旧草稿中的单字符串值由前端兼容迁移为单元素数组。

原房换装使用以下预设风格：`现代轻奢`、`意式极简`、`新中式`、`现代法式`、`极简奶油风`、`现代简约`、`侘寂风`、`南洋复古风`、`美式现代`、`日式极简禅风`。若用户选择“使用补充描述作为风格提示词”，前端会省略 `style`，服务端应以 `description` 与 `polished_prompt` 作为风格指令，不得将该展示文案当作风格值校验。

服务端必须验证：图片属于当前账号或当前企业可见范围；保存目标属于当前账号或企业允许写入范围；文件夹范围与请求 scope 一致；`refinement_id` 属于当前账号且与请求输入匹配。前端不得用伪造提示词或目标绕过权限。成功返回：

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

生成成功的每张图必须同时写入 `save_target` 对应的根目录或文件夹、加入小程序生图【图库】，并永久保留在此结果列表中。写入企业图库范围后应在 PC 素材库和小程序生图【图库】中立即可见。
