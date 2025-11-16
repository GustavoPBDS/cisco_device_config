import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

type PayloadItem = { device: string; config?: any; hash?: string };
type CacheItem = { ts: number; data: any };

const CACHE = new Map<string, CacheItem>();
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 dias

async function getFromCache(hash?: string) {
    if (!hash) return null;
    const it = CACHE.get(hash);
    if (!it) return null;
    if (Date.now() - it.ts > CACHE_TTL) {
        CACHE.delete(hash);
        return null;
    }
    return it.data;
}
async function setCache(hash: string, data: any) {
    CACHE.set(hash, { ts: Date.now(), data });
}

async function callLLMForBatch(items: PayloadItem[]) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
    const prompt = `
Você é um consultor especialista em redes Cisco.
Receberá um array de objetos { device, config } onde config é a configuração em CLI do dispositivo.
Sempre analise procurando:
- VLANs criadas mas não utilizadas
- PCs sem IP ou com IP repetido
- Switch sem ip default-gateway
- Roteador sem interfaces IP ou rotas
- Possíveis loops de spanning-tree
- Falta de redundância ou má prática de configuração
Responda SEMPRE em JSON, um array de objetos no formato abaixo (um objeto por dispositivo):
[
  {
    "device": "nome do dispositivo",
    "problemas": [ "descrição do problema 1", "descrição do problema 2" ],
    "melhorias": [ "sugestão 1", "sugestão 2" ],
    "resumo": "Resumo geral do dispositivo"
  }
]
Imprima somente o JSON. Não escreva texto extra.
Configurações para análise:
${JSON.stringify(items.map(i => ({ device: i.device, config: i.config })))}
`;
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
    });

    const raw = result.response.text();
    return JSON.parse(raw);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const items = (body.scenario || []) as PayloadItem[];

        const finalResultsMap = new Map<string, any>();
        const toAsk: PayloadItem[] = [];
        const deviceToHash = new Map<string, string | undefined>();

        for (const it of items) {
            const device = it.device;
            const cfg = it.config;

            if (!cfg || Object.keys(cfg).length === 0) {
                finalResultsMap.set(device, {
                    device,
                    problemas: [],
                    melhorias: [],
                    resumo: "Sem configuração",
                });
                continue;
            }

            const cached = await getFromCache(it.hash);
            if (cached) {
                finalResultsMap.set(device, cached);
                continue;
            }

            toAsk.push(it);
            deviceToHash.set(device, it.hash);
        }

        if (toAsk.length > 0) {
            try {
                const llmResp = await callLLMForBatch(toAsk);
                if (!Array.isArray(llmResp)) throw new Error("Resposta LLM inválida");

                for (const respItem of llmResp) {
                    const deviceName = respItem.device;
                    const hash = deviceToHash.get(deviceName);
                    const normalized = {
                        device: deviceName,
                        problemas: Array.isArray(respItem.problemas) ? respItem.problemas : [],
                        melhorias: Array.isArray(respItem.melhorias) ? respItem.melhorias : [],
                        resumo: respItem.resumo ?? "",
                    };
                    if (hash) await setCache(hash, normalized);
                    finalResultsMap.set(deviceName, normalized);
                }

                for (const it of toAsk) {
                    if (!finalResultsMap.has(it.device)) {
                        finalResultsMap.set(it.device, {
                            device: it.device,
                            problemas: ["Erro: LLM não retornou análise para este dispositivo"],
                            melhorias: [],
                            resumo: "",
                        });
                    }
                }
            } catch (err) {
                console.error("LLM batch error:", err);
                for (const it of toAsk) {
                    finalResultsMap.set(it.device, {
                        device: it.device,
                        problemas: ["Erro de análise (LLM)"],
                        melhorias: [],
                        resumo: "",
                    });
                }
            }
        }

        const finalArray = items.map((it) => {
            return finalResultsMap.get(it.device) ?? {
                device: it.device,
                problemas: ["Não foi possível recuperar análise"],
                melhorias: [],
                resumo: "",
            };
        });

        return NextResponse.json({ data: finalArray });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Erro ao processar análise" }, { status: 500 });
    }
}