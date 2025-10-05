// src/components/forms/interface/configContainer.tsx

import TabItem from "@/components/TabItem";
import { IPortModes } from "@/interfaces/devices";
import { X } from "lucide-react";
import { Tabs } from "radix-ui";
import { useEffect, useState } from "react";
import { IInterfaceConfig, IVlan } from "../switch-form";
import AccessForm from "./access-form";
import TrunkForm from "./trunk-form";

interface IProps {
    onClose: () => void;
    title: string;
    vlans: IVlan[];
    initialConfig: IInterfaceConfig;
    onApply: (config: IInterfaceConfig) => void;
}

export default function ConfigContainer({ onClose, title, vlans, initialConfig, onApply }: IProps) {

    const [localConfig, setLocalConfig] = useState<IInterfaceConfig>(initialConfig);

    const updateLocalConfig = (newConfig: Partial<IInterfaceConfig>) => {
        setLocalConfig(prev => ({
            ...prev,
            ...newConfig,
        }));
    };

    const handleTabChange = (value: string) => {
        updateLocalConfig({ mode: value as IPortModes });
    };

    const handleApply = () => {
        onApply(localConfig);
        updateLocalConfig({ trunkVlans: localConfig.trunkVlans?.sort((a, b) => Number(a) - Number(b)) })
        onClose();
    };

    useEffect(() => {
        const defaults: Partial<IInterfaceConfig> = {};
        if (localConfig.bpduGuard === undefined) defaults.bpduGuard = true;
        if (localConfig.portfast === undefined) defaults.portfast = true;
        if (localConfig.mode === undefined) defaults.mode = 'access';

        if (Object.keys(defaults).length > 0) {
            updateLocalConfig(defaults);
        }
    }, []);

    return (
        <div className="w-[95vw] max-w-lg fixed z-30 left-2.5 top-[20%] bg-gray-900 p-2 rounded-md flex flex-col gap-5">
            <div className="flex justify-between items-center">
                <h5 className="text-md font-semibold">{title}</h5>
                <span className="cursor-pointer" onClick={onClose}>
                    <X />
                </span>
            </div>
            <div className="flex flex-col gap-4">
                <Tabs.Root
                    value={localConfig.mode ?? 'access'}
                    onValueChange={handleTabChange}
                    className="w-full max-w-[600px] flex flex-col items-center gap-1"
                >
                    <Tabs.List className="grid grid-cols-2 border-b-3 border-zinc-600 w-full">
                        <TabItem title="Access" value="access" isSelected={localConfig.mode === "access"} />
                        <TabItem title="Trunk" value="trunk" isSelected={localConfig.mode === "trunk"} />
                    </Tabs.List>

                    <Tabs.Content value="access" className="w-full">
                        <AccessForm
                            vlans={vlans}
                            config={localConfig}
                            onConfigChange={updateLocalConfig}
                        />
                    </Tabs.Content>
                    <Tabs.Content value="trunk" className="w-full">
                        <TrunkForm
                            vlans={vlans}
                            config={localConfig}
                            onConfigChange={updateLocalConfig}
                        />
                    </Tabs.Content>
                </Tabs.Root>

                <button
                    type="button"
                    onClick={handleApply}
                    className="py-1.5 px-3 rounded-md text-sm bg-green-600 w-fit self-end cursor-pointer hover:bg-green-700"
                >
                    Aplicar e Fechar
                </button>
            </div>
        </div>
    );
}