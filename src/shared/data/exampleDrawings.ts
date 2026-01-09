import type { ExcalidrawContent } from "@/shared/types/drawing";
import exampleData from "./exampleDrawings.json";

interface ExampleDrawingData {
	id: string;
	title: string;
	parent_id: string | null;
	content: ExcalidrawContent;
}

export const EXAMPLE_DRAWINGS = (
	exampleData.drawings as ExampleDrawingData[]
).map((d) => ({
	id: d.id,
	title: d.title,
	parent_id: d.parent_id,
	content: d.content as ExcalidrawContent,
}));
