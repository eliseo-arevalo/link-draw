import { useState } from "react"
import { useTreeStore } from "@/shared/store/treeStore"
import { useThemeStore } from "@/shared/store/themeStore"
import { getThemeColors } from "@/shared/styles/theme"

export function CollaborationPanel() {
  const {
    isCollaborating,
    collaborationRoom,
    enableCollaboration,
    disableCollaboration
  } = useTreeStore()

  const { theme } = useThemeStore()
  const colors = getThemeColors(theme)

  const [roomId, setRoomId] = useState("")
  const [password, setPassword] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleJoin = async () => {
    if (!roomId.trim()) {
        setError("Room ID is required")
        return
    }

    setIsJoining(true)
    setError(null)

    try {
        await enableCollaboration(roomId.trim(), password.trim() || null)
    } catch (err) {
        console.error("Failed to join room:", err)
        setError("Failed to join room")
    } finally {
        setIsJoining(false)
    }
  }

  if (isCollaborating) {
    return (
      <div
        className="flex flex-col gap-2 p-4 border-b"
        style={{
            borderColor: colors.border,
            backgroundColor: colors.backgroundSecondary
        }}
      >
        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: colors.text }}>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="truncate">Room: {collaborationRoom}</span>
        </div>
        <button
            type="button"
            onClick={disableCollaboration}
            className="px-3 py-1.5 text-xs text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
        >
            Disconnect
        </button>
      </div>
    )
  }

  return (
    <div
        className="flex flex-col gap-2 p-4 border-b"
        style={{ borderColor: colors.border }}
    >
      <h3
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: colors.textSecondary }}
      >
          Collaboration
      </h3>

      <div className="flex flex-col gap-2">
        <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Room ID"
            className="px-2 py-1.5 text-sm rounded border focus:outline-none"
            style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text
            }}
        />
        <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (optional)"
            className="px-2 py-1.5 text-sm rounded border focus:outline-none"
            style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text
            }}
        />

        {error && <span className="text-xs text-red-500">{error}</span>}

        <button
            type="button"
            onClick={handleJoin}
            disabled={isJoining}
            className="px-3 py-1.5 text-xs text-white rounded transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: colors.primary }}
        >
            {isJoining ? "Joining..." : "Join Room"}
        </button>
      </div>
    </div>
  )
}
