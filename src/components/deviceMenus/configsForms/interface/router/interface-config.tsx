import { X } from "lucide-react";
import { IRouterInterfaceConfig, IRouterSubInterfaceConfig } from "../../router-form";
import { NetworkDeviceData } from "@/interfaces/devices";
import RouteInStickConfig from "./route-in-stick-config";

interface IProps {
    portName: string;
    config: IRouterInterfaceConfig; // Recebe a configuração atual
    allSortedVlans: string[];
    onClose: () => void;
    destinationDevice: NetworkDeviceData;
    destinationPort: string;
    onSubInterfaceChange: (port: string, vlanId: string, field: keyof IRouterSubInterfaceConfig, value: string) => void;
}

export function RouterInterfaceConfigContainer({
    portName,
    config,
    allSortedVlans,
    onClose,
    destinationDevice,
    destinationPort,
    onSubInterfaceChange,
}: IProps) {
    const vlansInOtherDevice = destinationDevice?.config?.interfaces?.[destinationPort]?.trunkVlans ?? [];

    // Cria um handler específico para este modal, já preenchendo o nome da porta
    const handleLocalSubInterfaceChange = (vlanId: string, field: keyof IRouterSubInterfaceConfig, value: string) => {
        onSubInterfaceChange(portName, vlanId, field, value);
    };

    return (
        <div className="w-[95vw] max-w-lg fixed z-30 left-2.5 top-[20%] bg-gray-900 p-2 rounded-md flex flex-col gap-5">
            <div className="flex justify-between items-center">
                <h5 className="text-md font-semibold">{`Configuração da porta ${portName}`}</h5>
                <span className="cursor-pointer p-1 rounded-full hover:bg-zinc-700" onClick={onClose}><X size={20} /></span>
            </div>

            <div className="flex flex-col gap-4">
                <h5 className="font-semibold">Router-on-a-Stick</h5>
                {vlansInOtherDevice.length > 0 ? (
                    <RouteInStickConfig
                        vlansOnPort={vlansInOtherDevice}
                        allSortedVlans={allSortedVlans}
                        subInterfaceConfigs={config.subInterfaces || {}}
                        onConfigChange={handleLocalSubInterfaceChange}
                    />
                ) : (
                    <p className="text-sm text-zinc-500 text-center p-4 border-2 border-dashed border-zinc-700 rounded-md">
                        Nenhuma VLAN em modo 'trunk' na porta de destino.
                    </p>
                )}
                {/* O botão agora apenas fecha o modal, pois as alterações já foram aplicadas em tempo real */}
                <button type="button" onClick={onClose} className="py-1.5 px-3 rounded-md text-sm bg-sky-600 w-fit self-end cursor-pointer hover:bg-sky-700 transition-colors">
                    Fechar
                </button>
            </div>
        </div>
    );
}

