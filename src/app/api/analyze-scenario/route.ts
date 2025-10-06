import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const scenario = body.scenario;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" })
        const prompt = `
Você é um consultor especialista em redes Cisco.
Receberá um cenário de dispositivos com suas configurações (em CLI Cisco).
Sempre analise procurando:
- VLANs criadas mas não utilizadas
- PCs sem IP ou com IP repetido
- Switch sem ip default-gateway
- Roteador sem interfaces IP ou rotas
- Possíveis loops de spanning-tree
- Falta de redundância ou má prática de configuração
Responda SEMPRE em JSON, um objeto por dispositivo, neste formato:
[
    {
    "device": "nome do dispositivo",
    "problemas": [ "descrição do problema 1", "descrição do problema 2" ],
    "melhorias": [ "sugestão 1", "sugestão 2" ],
    "resumo": "Resumo geral do dispositivo"
    }
]
Se não houver problemas, deixe "problemas" vazio.
Se não houver melhorias, deixe "melhorias" vazio.
Importante: Não escreva nada fora do JSON. Nenhum texto extra.
Configuração recebida:
${JSON.stringify(scenario)}`
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        const raw = result.response.text();
        const parsed = JSON.parse(raw)

        return NextResponse.json({ data: parsed });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Erro ao processar análise" }, { status: 500 });
    }
}
