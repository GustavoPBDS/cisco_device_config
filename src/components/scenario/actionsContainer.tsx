import { useScenario } from "@/contexts/scenario.context"
import { analyzeScenario } from "./actions"
import { useState } from "react"
import ExportScenarioComponent from "./menus/scenario-exports"
import { stringify } from "querystring"
import AnalyzeContainer from "./menus/analyze-container"

interface IProps {

}

export interface IAnalyzeJsonParsed {
    device: string;
    problemas: string[];
    melhorias: string[];
    resumo: string;
}

export default function ScenarioActionsContainer({ }: IProps) {

    const { devices, exportConfig } = useScenario()

    const [showConfigs, setShowConfigs] = useState<{ visible: boolean; configs: Record<string, string>[] }>({ visible: false, configs: [] })

    const [showAnalyze, setShowAnalyze] = useState(false)


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

        const res = await analyzeScenario(scenario)

        return res as IAnalyzeJsonParsed[]
    }

    const handleExportScenarioClick = () => {
        const configs = exportScenarioConfig()

        setShowConfigs({ visible: true, configs })
    }
    const handleCloseExport = () => {
        setShowConfigs({ visible: false, configs: [] })
    }
    const handleCloseAnalyze = () => {
        setShowAnalyze(false)
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