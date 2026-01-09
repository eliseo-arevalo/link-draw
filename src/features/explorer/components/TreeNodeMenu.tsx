import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/shared/components/DropdownMenu"
import { Icon } from "@/shared/components/Icon"
import { useThemeStore } from "@/shared/store/themeStore"
import { getThemeColors } from "@/shared/styles/theme"

interface TreeNodeMenuProps {
  isOpen: boolean
  onCreateChild: () => void
  onDuplicate: () => void
  onDuplicateWithChildren: () => void
  onDelete: () => void
  anchorRef?: React.RefObject<HTMLDivElement | null>
}

export function TreeNodeMenu({
  isOpen,
  onCreateChild,
  onDuplicate,
  onDuplicateWithChildren,
  onDelete,
  anchorRef,
}: TreeNodeMenuProps) {
  const { theme } = useThemeStore()
  const colors = getThemeColors(theme)

  return (
    <DropdownMenu isOpen={isOpen} anchorRef={anchorRef}>
      <DropdownMenuItem
        icon={<Icon name="plus" size={14} color={colors.text} />}
        label="Create Child"
        onClick={onCreateChild}
      />

      <DropdownMenuSeparator />

      <DropdownMenuItem
        icon={<Icon name="copy" size={14} color={colors.text} />}
        label="Duplicate"
        onClick={onDuplicate}
      />

      <DropdownMenuItem
        icon={<Icon name="copy" size={14} color={colors.text} />}
        label="Duplicate with Children"
        onClick={onDuplicateWithChildren}
      />

      <DropdownMenuSeparator />

      <DropdownMenuItem
        icon={<Icon name="trash" size={14} color="#ef4444" />}
        label="Delete"
        onClick={onDelete}
        variant="danger"
      />
    </DropdownMenu>
  )
}
