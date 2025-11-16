import { serializeState, useScenario } from "@/contexts/scenario.context"
import { analyzeScenario } from "./actions"
import { useCallback, useRef, useState } from "react"
import ExportScenarioComponent from "./menus/scenario-exports"
import { stringify } from "querystring"
import AnalyzeContainer from "./menus/analyze-container"
import localforage from "localforage"
import { toast } from "sonner"
import { stableHash } from "@/utils/hash"
interface IProps {

}

export interface IAnalyzeJsonParsed {
    device: string;
    problemas: string[];
    melhorias: string[];
    resumo: string;
}
export default function ScenarioActionsContainer({ }: IProps) {
    const clickTimeout = useRef<any>(null)
    const { devices, exportConfig, clearScenario } = useScenario()

    const [showConfigs, setShowConfigs] = useState<{ visible: boolean; configs: Record<string, string>[] }>({ visible: false, configs: [] })

    const [showAnalyze, setShowAnalyze] = useState(false)

    const CACHE_TTL = 1000 * 60 * 60 * 24 * 7 // 7 dias
    const CHUNK_SIZE = 5

    const getCachedAnalysis = async (hash: string) => {
        const key = `analysis:${hash}`
        const item = await localforage.getItem<{ ts: number; data: IAnalyzeJsonParsed }>(key)
        if (!item) return null
        if (Date.now() - item.ts > CACHE_TTL) {
            await localforage.removeItem(key)
            return null
        }
        return item.data
    }

    const setCachedAnalysis = async (hash: string, data: IAnalyzeJsonParsed) => {
        const key = `analysis:${hash}`
        await localforage.setItem(key, { ts: Date.now(), data })
    }

    const chunkArray = <T,>(arr: T[], size: number) => {
        const chunks: T[][] = []
        for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
        return chunks
    }

    const exportScenarioConfig = () => {
        const configs: Record<string, string>[] = []
        devices.forEach((device, deviceId) => {
            configs.push({
                [device.label]: exportConfig(deviceId)
            })
        })
        return configs
    }


    const handleAnalyzeScenario = async () => {
        const scenario = exportScenarioConfig()
        const toAnalyze: Array<{ device: string; config: any; hash: string }> = []
        const cachedResults: IAnalyzeJsonParsed[] = []

        for (const item of scenario) {
            const device = Object.keys(item)[0]
            const config = (item as any)[device]

            if (!config || (typeof config === 'string' && config.trim() === '') || (typeof config === 'object' && Object.keys(config).length === 0)) {
                cachedResults.push({
                    device,
                    problemas: [],
                    melhorias: [],
                    resumo: 'Dispositivo sem configuração. Nenhuma análise necessária.'
                })
                continue
            }

            const hash = await stableHash(config)
            const cached = await getCachedAnalysis(hash)
            if (cached) {
                cachedResults.push(cached)
            } else {
                toAnalyze.push({ device, config, hash })
            }
        }

        if (toAnalyze.length === 0) {
            const finalMap = new Map<string, IAnalyzeJsonParsed>()
            for (const c of cachedResults) finalMap.set(c.device, c)
            return scenario.map(s => {
                const d = Object.keys(s)[0]
                return finalMap.get(d) || {
                    device: d,
                    problemas: [],
                    melhorias: [],
                    resumo: 'Nenhuma análise disponível.'
                }
            })
        }

        const chunks = chunkArray(toAnalyze, CHUNK_SIZE)
        const analyzedResults: IAnalyzeJsonParsed[] = []

        for (const chunk of chunks) {
            try {
                const payload = chunk.map(c => ({ device: c.device, config: c.config, hash: c.hash }))
                const res = await analyzeScenario(payload)
                if (Array.isArray(res)) {
                    for (let i = 0; i < res.length; i++) {
                        const r = res[i] as IAnalyzeJsonParsed
                        const h = chunk[i].hash
                        await setCachedAnalysis(h, r)
                        analyzedResults.push(r)
                    }
                } else {
                    toast.error('Resposta inesperada do servidor na análise.')
                }
            } catch (err) {
                console.error(err)
                toast.error('Erro ao analisar lote. Tente novamente.')
                for (const c of chunk) {
                    analyzedResults.push({
                        device: c.device,
                        problemas: ['Erro ao analisar dispositivo'],
                        melhorias: [],
                        resumo: ''
                    })
                }
            }
        }

        const finalMap = new Map<string, IAnalyzeJsonParsed>()
        for (const c of [...cachedResults, ...analyzedResults]) finalMap.set(c.device, c)
        const finalOrdered: IAnalyzeJsonParsed[] = scenario.map(s => {
            const device = Object.keys(s)[0]
            return finalMap.get(device) || {
                device,
                problemas: ['Não foi possível recuperar análise'],
                melhorias: [],
                resumo: ''
            }
        })
        return finalOrdered
    }

    const handleExportScenarioClick = () => {
        const configs = exportScenarioConfig()
        const scenario = exportScenarioConfig()
        console.log(JSON.stringify({ scenario }))

        setShowConfigs({ visible: true, configs })
    }
    const handleCloseExport = () => {
        setShowConfigs({ visible: false, configs: [] })
    }
    const handleCloseAnalyze = () => {
        setShowAnalyze(false)
    }

    const warnDoubleClick = () => {
        toast.warning('Clique duas vezes para realizar a ação')
    }
    const requestClearScenario = useCallback(() => {
        if (clickTimeout.current) {
            clearTimeout(clickTimeout.current);
        }
        clickTimeout.current = setTimeout(() => {
            warnDoubleClick();
        }, 250);
    }, []);

    const confirmClearScenario = () => {
        localforage.clear()
        clearScenario()
    }

    const handleOpenExport = () => {
        handleCloseAnalyze()
        handleExportScenarioClick()
    }
    const handleOpenAnalyze = () => {
        handleCloseExport()
        setShowAnalyze(true)
    }

    return (
        <div
            className="fixed z-[5] top-2 right-2 flex items-center gap-2"
        >
            <button
                onClick={requestClearScenario}
                onDoubleClick={confirmClearScenario}
                className="
                    cursor-pointer bg-sky-500 px-3 py-1.5 w-fit rounded-md font-semibold text-sm *:
                    hover:scale-95
                "
            >Limpar Cenário</button>
            <button
                onClick={handleOpenExport}
                className="
                    cursor-pointer bg-sky-500 px-3 py-1.5 w-fit rounded-md font-semibold text-sm *:
                    hover:scale-95
                "
            >Exportar Cenário</button>
            <button
                onClick={handleOpenAnalyze}
                className="
                    cursor-pointer bg-sky-500 px-3 py-1.5 w-fit rounded-md font-semibold text-sm *:
                    hover:scale-95
                "
            >Analisar Cenário</button>

            {showConfigs.visible && showConfigs.configs && <ExportScenarioComponent
                onClose={handleCloseExport}
                configurations={showConfigs.configs}
            />}
            {showAnalyze && <AnalyzeContainer
                onClose={handleCloseAnalyze}
                handleAnalyzeScenario={handleAnalyzeScenario}
            />}
        </div>
    )
}