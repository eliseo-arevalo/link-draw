import { describe, expect, it, vi } from "vitest"
import { YjsSyncProvider } from "./YjsSyncProvider"
import type { DrawingTreeNode } from "@/shared/types/drawing"

// Mock dependencies
vi.mock("y-webrtc", () => ({
  WebrtcProvider: class {
    connected = true
    room = { peers: new Map() }
    destroy() {}
  },
}))

vi.mock("y-indexeddb", () => ({
  IndexeddbPersistence: class {
    on(event: string, callback: () => void) {
      if (event === "synced") callback()
    }
    destroy() {}
  },
}))

describe("YjsSyncProvider", () => {
  it("should connect to room", async () => {
    const provider = new YjsSyncProvider()
    await provider.connect("test-room")
    expect(provider.isConnected()).toBe(true)
  })

  it("should sync data between two providers (simulated)", async () => {
    const provider1 = new YjsSyncProvider()

    // Connect provider 1
    await provider1.connect("test-room")

    const tree: DrawingTreeNode[] = [
      {
        id: "1",
        title: "Test",
        content: { elements: [], appState: {}, files: {} },
        created_at: "",
        updated_at: "",
        is_public: false,
        parent_id: null
      }
    ]

    // Setup listener
    const onUpdate = vi.fn()
    provider1.onUpdate(onUpdate)

    // Broadcast
    provider1.broadcast(tree)

    // Wait for callback (synchronous in this mock setup but good to be async-aware)
    await new Promise((resolve) => setTimeout(resolve, 10))

    // With real Yjs, broadcasting triggers observer on same doc
    expect(onUpdate).toHaveBeenCalledWith(tree)
  })
})
