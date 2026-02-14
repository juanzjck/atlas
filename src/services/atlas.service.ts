import atlasAgent from "../agent/agent.js"; // <- your existing agent function

export async function processMeetingWithAtlas(params: {
  title: string;
  transcript: string;
}) {
  const { title, transcript } = params;

  const atlasPrompt = `
    Ingest meeting:
    Title: ${title}
    Transcript:
    ${transcript}
    `.trim();

  const atlas_response = await atlasAgent(atlasPrompt);
  return atlas_response;
}