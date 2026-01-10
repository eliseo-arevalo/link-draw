import { useEffect, useState } from "react";
import { useThemeStore } from "@/shared/store/themeStore";
import { getThemeColors } from "@/shared/styles/theme";

const MOBILE_WARNING_KEY = "linkdraw:mobile-warning-dismissed";

export function MobileWarning() {
	const { theme } = useThemeStore();
	const colors = getThemeColors(theme);
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		const isMobile = window.innerWidth < 768;
		const wasDismissed = localStorage.getItem(MOBILE_WARNING_KEY);

		if (isMobile && !wasDismissed) {
			setIsVisible(true);
		}
	}, []);

	const handleDismiss = () => {
		localStorage.setItem(MOBILE_WARNING_KEY, "true");
		setIsVisible(false);
	};

	if (!isVisible) return null;

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				backgroundColor: "rgba(0, 0, 0, 0.5)",
				zIndex: 9999,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "1rem",
			}}
		>
			<div
				style={{
					backgroundColor: colors.background,
					borderRadius: "12px",
					padding: "1.5rem",
					maxWidth: "400px",
					width: "100%",
					boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "0.75rem",
						marginBottom: "1rem",
					}}
				>
					<div
						style={{
							fontSize: "24px",
						}}
					>
						📱
					</div>
					<h2
						style={{
							fontSize: "18px",
							fontWeight: 600,
							color: colors.text,
							margin: 0,
						}}
					>
						Mobile Notice
					</h2>
				</div>

				<p
					style={{
						fontSize: "14px",
						color: colors.textSecondary,
						lineHeight: 1.5,
						margin: "0 0 1.5rem 0",
					}}
				>
					LinkDraw is optimized for desktop use. While you can browse on mobile,
					the best experience is on a computer with a larger screen.
				</p>

				<button
					type="button"
					onClick={handleDismiss}
					style={{
						width: "100%",
						padding: "0.75rem",
						backgroundColor: colors.text,
						color: colors.background,
						border: "none",
						borderRadius: "8px",
						fontSize: "14px",
						fontWeight: 500,
						cursor: "pointer",
					}}
				>
					Got it
				</button>
			</div>
		</div>
	);
}
