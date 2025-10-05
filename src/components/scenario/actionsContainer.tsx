import { useScenario } from "@/contexts/scenario.context"
import { analyzeScenario } from "./actions"
import { useState } from "react"
import ExportScenarioComponent from "./menus/scenario-exports"
import { stringify } from "querystring"

interface IProps {

}

export default function ScenarioActionsContainer({ }: IProps) {

    const { devices, exportConfig } = useScenario()

    const [showConfigs, setShowConfigs] = useState<{ visible: boolean; configs: Record<string, string>[] }>({ visible: false, configs: [] })


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

        console.log(res)
    }

    const handleExportScenarioClick = () => {
        const configs = exportScenarioConfig()

        setShowConfigs({ visible: true, configs })
    }

    return (
        <div
            className="fixed z-[5] top-2 right-2 flex items-center gap-2"
        >
            <button
                onClick={handleExportScenarioClick}
                className="
                    cursor-pointer bg-sky-500 px-3 py-1.5 w-fit rounded-md font-semibold text-sm *:
                    hover:scale-95
                "
            >Exportar Cenário</button>
            <button
                onClick={handleAnalyzeScenario}
                className="
                    cursor-pointer bg-sky-500 px-3 py-1.5 w-fit rounded-md font-semibold text-sm *:
                    hover:scale-95
                "
            >Analisar Cenário</button>

            {showConfigs.visible && showConfigs.configs && <ExportScenarioComponent
                onClose={() => setShowConfigs({ visible: false, configs: [] })}
                configurations={showConfigs.configs}
            />}
        </div>
    )
}