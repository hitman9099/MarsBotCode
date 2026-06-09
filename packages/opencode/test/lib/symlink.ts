import fs from "fs/promises"
import os from "os"
import path from "path"

type SymlinkType = "file" | "dir"

function isPermissionError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    ((error as { code?: string }).code === "EPERM" || (error as { code?: string }).code === "EACCES")
  )
}

export async function canCreateSymlink(type: SymlinkType = "file") {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-symlink-"))
  const target = path.join(dir, "target")
  const link = path.join(dir, "link")
  try {
    if (type === "dir") await fs.mkdir(target)
    else await fs.writeFile(target, "x", "utf8")
    await fs.symlink(target, link, type)
    return true
  } catch (error) {
    if (process.platform === "win32" && isPermissionError(error)) return false
    throw error
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined)
  }
}
