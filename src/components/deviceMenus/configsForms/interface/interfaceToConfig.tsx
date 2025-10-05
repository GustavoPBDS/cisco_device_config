import { useScenario } from "@/contexts/scenario.context";
import { NetworkDeviceData } from "@/interfaces/devices";
import { useMemo, useState, Dispatch, SetStateAction } from "react";
import { IInterfaceConfig as ISwitchInterfaceConfig, IVlan } from "../switch-form";
import { IRouterInterfaceConfig, IRouterSubInterfaceConfig } from "../router-form";
import { RouterInterfaceConfigContainer } from "./router/interface-config";
import ConfigContainer from "./configContainer";

type ICombinedInterfaceConfig = ISwitchInterfaceConfig & IRouterInterfaceConfig;

interface IProps {
    device: NetworkDeviceData;
    port: string;
    vlans?: IVlan[];
    setInterfaceConfigs?: Dispatch<SetStateAction<Record<string, ICombinedInterfaceConfig>>>;
    allSortedVlans?: string[];
    onSubInterfaceChange?: (port: string, vlanId: string, field: keyof IRouterSubInterfaceConfig, value: string) => void;
    interfaceConfigs: Record<string, ICombinedInterfaceConfig>;
}

export default function InterfaceToConfig(props: IProps) {
    const { device, port, vlans, interfaceConfigs, setInterfaceConfigs, allSortedVlans, onSubInterfaceChange } = props;
    const { devices } = useScenario();
    const [openPortMenuConfig, setOpenPortMenuConfig] = useState(false);

    const [connectedDevice, destinationPort] = useMemo(() => {
        const connection = Array.from(device.portsConnected.values()).find(conn => conn?.port === port);
        return [devices.get(connection?.deviceConnected!), connection?.deviceConnectedPort];
    }, [port, device.portsConnected, devices]);

    const portShorthand = port[0].toLocaleLowerCase() + port.split(' ')[1];
    const portConfigurated = Object.keys(interfaceConfigs[port] ?? {}).length > 0;
    const baseClass = "group flex justify-around items-center p-1 text-sm rounded-sm w-[30%] cursor-pointer hover:scale-95";
    const containerClass = `${baseClass} ${portConfigurated ? 'bg-gray-900' : 'bg-gray-700'}`;
    const textClass = `select-none ${portConfigurated ? 'text-gray-200' : 'text-zinc-300'}`;

    const handleSwitchApplyConfig = (newConfig: ISwitchInterfaceConfig) => {
        if (setInterfaceConfigs) {
            setInterfaceConfigs(prev => ({ ...prev, [port]: { ...prev[port], ...newConfig } }));
        }
    };

    return (
        <>
            <div onClick={() => setOpenPortMenuConfig(true)} className={containerClass}>
                <p className={textClass}>{portShorthand}</p>
                <p className={textClass}>{connectedDevice?.label ?? '...'}</p>
            </div>

            {openPortMenuConfig && device.type === "switch" && (
                <ConfigContainer
                    onClose={() => setOpenPortMenuConfig(false)}
                    title={`Configuração da porta ${port}`}
                    vlans={vlans || []}
                    initialConfig={interfaceConfigs[port] ?? {}}
                    onApply={handleSwitchApplyConfig}
                />
            )}

            {openPortMenuConfig && device.type === "router" && onSubInterfaceChange && allSortedVlans && (
                <RouterInterfaceConfigContainer
                    onClose={() => setOpenPortMenuConfig(false)}
                    portName={port}
                    config={interfaceConfigs[port] ?? {}}
                    allSortedVlans={allSortedVlans}
                    onSubInterfaceChange={onSubInterfaceChange}
                    destinationDevice={connectedDevice!}
                    destinationPort={destinationPort!}
                />
            )}
        </>
    )
}

