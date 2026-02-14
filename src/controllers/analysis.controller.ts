import { analytics } from "@elevenlabs/elevenlabs-js/api/resources/conversationalAi/index.js";
import { WhiteCircleService } from "../services/analysis.service.js";

export type  scanForRiskBody = {
    messages: {
        role: string;
        content: string;
    }
}
// @ts-ignore
export async function scanForRisk(request:any,reply:any) {
    const whiteCircle = new WhiteCircleService(process.env.WHITECIRCLE_API_KEY!);
    const deployment_id = process.env.WHITECIRCLE_RISK;
    const result = await whiteCircle.checkSession({
    deployment_id: deployment_id || '',
    messages: [
        ...request.messages
    ],
    });

    return reply.send({
      analytics: result
    });
}