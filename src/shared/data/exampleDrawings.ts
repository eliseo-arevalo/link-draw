import exampleData from "./exampleDrawings.json";

export const EXAMPLE_DRAWINGS = exampleData.drawings.map((d) => ({
	id: d.id,
	title: d.title,
	parent_id: d.parent_id,
	content: d.content,
}));
