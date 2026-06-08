所有回答包括回复的文档，都要用中文。

- 如需重新生成 JavaScript SDK，运行 `./packages/sdk/js/script/build.ts`。
- 本仓库默认分支是 `dev`。
- 本地可能没有 `main` 引用；做 diff 时使用 `dev` 或 `origin/dev`。

## 提交与 PR 标题

提交信息和 PR 标题使用 conventional commit 风格：`type(scope): summary`。

有效类型包括 `feat`、`fix`、`docs`、`chore`、`refactor`、`test`。scope 可选；建议使用受影响的包或区域，例如 `core`、`opencode`、`tui`、`app`、`desktop`、`sdk` 或 `plugin`。

示例：`fix(tui): simplify thinking toggle styling`、`docs: update contributing guide`、`chore(sdk): regenerate types`。

## 代码风格

### 通用原则

- 除非确实需要组合或复用，否则保持逻辑在一个函数内。
- 不要提前抽取只使用一次的 helper。除非该 helper 被复用、隐藏了真实复杂边界，或有清晰独立命名能改善调用方可读性，否则将逻辑内联在调用处。
- 尽量避免 `try`/`catch`。
- 避免使用 `any` 类型。
- 尽量使用 Bun API，例如 `Bun.file()`。
- 尽量依赖类型推断；除非导出或清晰度需要，否则避免显式类型注解或接口。
- 优先使用函数式数组方法，例如 `flatMap`、`filter`、`map`，并在 `filter` 中使用类型保护以保持下游类型推断。
- 在 `src/config` 中新增配置模块时，遵循文件顶部现有的自导出模式，例如 `export * as ConfigAgent from "./agent"`。

如果某个值只使用一次，优先内联，减少变量总数。

```ts
// 好
const journal = await Bun.file(path.join(dir, "journal.json")).json()

// 坏
const journalPath = path.join(dir, "journal.json")
const journal = await Bun.file(journalPath).json()
```

### 解构

避免不必要的解构。使用点号访问可以保留上下文。

```ts
// 好
obj.a
obj.b

// 坏
const { a, b } = obj
```

### 导入

- 不要给导入起别名。不要使用 `import { foo as bar } from "..."`，也不要使用类似 `resolve as pathResolve` 的重命名导入。
- 不要使用星号导入。不要使用 `import * as Foo from "..."` 或 `import type * as Foo from "..."`。
- 如果需要命名空间风格的值，导入模块自己导出的命名空间，例如 `import { Project } from "@opencode-ai/core/project"`，然后引用 `Project.ID`。
- 对启动敏感入口中只在特定路径使用的重型模块，优先使用动态导入。在最窄作用域顶部解构动态导入的绑定，让它读起来像普通导入。避免内联链式写法，例如 `await import("./module").then((mod) => mod.value())` 或 `(await import("./module")).value()`。分支专用导入应放在对应分支内，以保持懒加载。

### 变量

优先使用 `const`，不要使用 `let`。使用三元表达式或提前返回代替重新赋值。

```ts
// 好
const foo = condition ? 1 : 2

// 坏
let foo
if (condition) foo = 1
else foo = 2
```

### 控制流

避免 `else`。优先提前返回。

```ts
// 好
function foo() {
  if (condition) return 1
  return 2
}

// 坏
function foo() {
  if (condition) return 1
  else return 2
}
```

### 复杂逻辑

当函数包含多个校验分支或支撑细节时，让主函数读起来像快乐路径，并把支撑细节移到下面的小 helper。

```ts
// 好
export function loadThing(input: unknown) {
  const config = requireConfig(input)
  const metadata = readMetadata(input)
  return createThing({ config, metadata })
}

function requireConfig(input: unknown) {
  ...
}
```

- 将 helper 放在其支撑代码附近；如果有助于可读性，放在主导出下方。
- 不要把简单表达式过度抽象成大量只使用一次的 helper；只有当它命名了真实概念，例如 `requireConfig` 或 `readMetadata` 时才抽取。
- 除非 helper 真的执行 effectful 工作，否则不要从 helper 返回 `Effect`。同步解析、校验和选项构建应保持同步。
- 解析不可信 JSON 字符串时，优先使用 Effect schema helper，例如 `Schema.UnknownFromJsonString` 和 `Schema.decodeUnknownOption`，不要手动 `JSON.parse` 后再包进 `Effect.try`。
- 只给非显而易见的约束和令人意外的行为加注释；不要为显而易见的赋值或控制流加注释。

### Schema 定义（Drizzle）

字段名使用 snake_case，这样列名不需要重新定义为字符串。

```ts
// 好
const table = sqliteTable("session", {
  id: text().primaryKey(),
  project_id: text().notNull(),
  created_at: integer().notNull(),
})

// 坏
const table = sqliteTable("session", {
  id: text("id").primaryKey(),
  projectID: text("project_id").notNull(),
  createdAt: integer("created_at").notNull(),
})
```

## 测试

- 尽量避免 mock。
- 测试真实实现，不要把逻辑复制到测试里。
- 测试不能从仓库根目录运行，根目录有 `do-not-run-tests-from-root` 保护；请从包目录运行，例如 `packages/opencode`。

## 类型检查

- 始终从包目录运行 `bun typecheck`，例如 `packages/opencode`；不要直接运行 `tsc`。

## V2 Session Core

- 保持 durable prompt admission 与模型执行分离。`SessionV2.prompt(...)` 会先写入一条 durable `session_input` 记录，再调度 advisory `SessionExecution.wake(sessionID)`；除非 `resume: false` 请求仅 admission。序列化 runner 会在安全边界把已 admission 的输入提升为可见用户消息。
- 复用 Session ID 会接管已有 Session。复用 prompt message ID 只有在 Session、prompt 和 delivery mode 完全匹配时才会协调为精确重试；冲突复用必须失败。历史 projected prompts 会在精确重试期间懒合成 promoted inbox records。
- 保持 `SessionExecution` 为进程全局且基于 Session ID。其本地实现拥有进程本地 Session coordinator，并且只有在 drain 开始时，才通过 `SessionStore` 加 `LocationServiceMap.get(session.location)` 发现 placement；任何 layer 都不应直接持有 Session ID。V2 interruption 目标是该 Session 的活动进程本地 ownership chain；空闲或缺失 interruption 是 no-op。
- 保持 `SessionRunner`、模型解析、工具注册表、权限和文件系统为 Location-scoped。省略 `Location.workspaceID` 表示隐式本地 placement；显式 workspace identity 保留给未来 placement 语义。
- 每个 provider turn 保留一次显式 `llm.stream(request)` 调用，并在 durable continuation 前重新加载 projected history。不要通过 legacy `SessionPrompt.loop(...)` 桥接，也不要把编排委托给内存 tool loop。
- 在 clustering 实现之前，保持本地 Session drains 为进程本地。`SessionRunCoordinator` 会 join 显式同 Session resumes、合并 prompt wakeups，并允许不同 Sessions 并发运行。Advisory wakes 只 drain eligible durable inbox rows；崩溃后活动恢复需要单独显式设计，之后才可以重试 provider work。
- 保持 delivery vocabulary 明确。Prompts 默认 steer，并在下一个安全 provider-turn 边界合并进活动 activity。显式 `queue` inputs 会在当前 activity settled 后，以 FIFO 方式一次打开一个未来 activity。
- 保持 EventV2 replay owner claims 与 clustered Session execution ownership 分离。
- 保持 System Context algebra、registry 和 built-ins 位于 `src/system-context`；保持 Context Source producers 与其 observed domains 同域；保持 Session History selection 和 Context Epoch persistence 由 Session 拥有。
