import { useScenario } from "@/contexts/scenario.context";
import { NetworkDeviceData } from "@/interfaces/devices";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Node } from "reactflow";
import { toast } from "sonner";
import InterfaceToConfig from "./interface/interfaceToConfig";
import { getNetworkInfo, ipToLong, longToIp } from "@/utils/calcs-ips";
import { IInterfaceConfig as ISwitchInterfaceConfig } from "./switch-form";
import DhcpExclusionConfig from "./dhcp/dhcp-exclusion";

export interface IRouterSubInterfaceConfig {
    ip?: string;
    subnetMask?: string;
    ipv6?: string;
}
export interface IRouterInterfaceConfig {
    ip?: string;
    subnetMask?: string;
    description?: string;
    isUp?: boolean;
    subInterfaces?: Record<string, IRouterSubInterfaceConfig>;
}
type ICombinedInterfaceConfig = ISwitchInterfaceConfig & IRouterInterfaceConfig;

interface IProps {
    node: Node<NetworkDeviceData>;
    onClose: () => void;
}

export default function RouterForm({ node, onClose }: IProps) {
    const { devices, updateDeviceConfig } = useScenario();
    const device = devices.get(node.id)!;
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [hostname, setHostname] = useState(device.config?.hostname ?? "");
    const [interfaceConfigs, setInterfaceConfigs] = useState<Record<string, ICombinedInterfaceConfig>>(
        () => device.config?.interfaces ?? {}
    );
    const [manualExclusions, setManualExclusions] = useState<string[]>(
        () => device.config?.dhcpExcluded ?? []
    )
    const autoExclusions = useMemo(() => {
        const exclusions = new Set<string>();
        Object.values(interfaceConfigs).forEach(iface => {
            if (iface.subInterfaces) {
                Object.values(iface.subInterfaces).forEach(sub => {
                    if (sub.ip && sub.subnetMask) {
                        exclusions.add(sub.ip); // Gateway
                        const netInfo = getNetworkInfo(sub.ip, sub.subnetMask);
                        if (netInfo) {
                            exclusions.add(netInfo.broadcastAddress); // Broadcast
                        }
                    }
                });
            }
        });
        return Array.from(exclusions).sort();
    }, [interfaceConfigs]);

    useEffect(() => {
        if (node) {
            const currentDevice = devices.get(node.id);
            if (currentDevice) {
                setHostname(currentDevice.config?.hostname ?? "");
                setInterfaceConfigs(currentDevice.config?.interfaces ?? {});
                setManualExclusions(currentDevice.config?.dhcpExcluded ?? []);
                setErrors({})
            }
        }
    }, [node]);

    useEffect(() => {
        const loadedExclusions = device.config?.dhcpExcluded ?? [];
        const autoExclusionsSet = new Set(autoExclusions);
        const actualManualIps = loadedExclusions.filter(ip => !autoExclusionsSet.has(ip));

        setManualExclusions(actualManualIps);

    }, [autoExclusions, device.config?.dhcpExcluded])

    const validateHostname = (value: string) => {
        if (!value) return "Hostname é obrigatório";
        if (!/^[a-zA-Z0-9-]+$/.test(value)) return "Use apenas letras, números e hífens";
        return "";
    };

    const handleHostnameChange = (value: string) => {
        setHostname(value);
        const error = validateHostname(value);
        setErrors(prev => ({ ...prev, hostname: error }));
    };

    const allUnifiedExclusions = useMemo(() => {
        const combined = new Set([...autoExclusions, ...manualExclusions]);
        return Array.from(combined).sort();
    }, [autoExclusions, manualExclusions]);


    const handleAddManualExclusion = (ip: string) => {
        setManualExclusions(prev => [...prev, ip].sort());
    };

    const handleRemoveManualExclusion = (ipToRemove: string) => {
        setManualExclusions(prev => prev.filter(ip => ip !== ipToRemove));
    };


    const allSortedVlans = useMemo(() => {
        const vlanSet = new Set<string>();
        for (const port of device.ports) {
            const connection = Array.from(device.portsConnected.values()).find(conn => conn?.port === port);
            if (connection) {
                const connectedDev = devices.get(connection.deviceConnected);
                const destPortConfig = connectedDev?.config?.interfaces?.[connection.deviceConnectedPort];
                if (destPortConfig?.mode === 'trunk' && destPortConfig.trunkVlans) {
                    destPortConfig.trunkVlans.forEach(vlanId => vlanSet.add(vlanId));
                }
            }
        }
        return Array.from(vlanSet).sort((a, b) => parseInt(a) - parseInt(b));
    }, [device.ports, device.portsConnected, devices]);

    const handleSubInterfaceChange = (
        port: string,
        vlanId: string,
        field: keyof IRouterSubInterfaceConfig,
        value: string
    ) => {
        const newConfigs = JSON.parse(JSON.stringify(interfaceConfigs));

        if (!newConfigs[port]) newConfigs[port] = {};
        if (!newConfigs[port].subInterfaces) newConfigs[port].subInterfaces = {};
        if (!newConfigs[port].subInterfaces[vlanId]) newConfigs[port].subInterfaces[vlanId] = {};

        newConfigs[port].subInterfaces[vlanId][field] = value;

        const recalculated = recalculateGlobalCascade(newConfigs);

        setInterfaceConfigs(recalculated);
    };


    const recalculateGlobalCascade = (currentConfigs: Record<string, IRouterInterfaceConfig>) => {
        let lastBroadcastLong = -1;

        allSortedVlans.forEach(vlanId => {
            let portForVlan: string | null = null;
            for (const port in currentConfigs) {
                if (currentConfigs[port].subInterfaces?.[vlanId]) {
                    portForVlan = port;
                    break;
                }
            }

            if (portForVlan) {
                const subIface = currentConfigs[portForVlan].subInterfaces![vlanId];

                if (vlanId !== allSortedVlans[0]) {
                    if (lastBroadcastLong !== -1) {
                        subIface.ip = longToIp(lastBroadcastLong + 2);
                    } else {
                        delete subIface.ip;
                    }
                }

                const info = getNetworkInfo(subIface.ip ?? '', subIface.subnetMask ?? '');
                lastBroadcastLong = info ? ipToLong(info.broadcastAddress) : -1;
            }
        });
        return currentConfigs;
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        const hostError = validateHostname(hostname);
        if (hostError) {
            setErrors(prev => ({ ...prev, hostname: hostError }));
            toast.error("Corrija os erros antes de salvar.");
            return;
        }

        updateDeviceConfig(node.id, {
            ...device.config,
            hostname,
            interfaces: interfaceConfigs,
            dhcpExcluded: allUnifiedExclusions,
        });
        toast.success("Configurações do roteador aplicadas!");
        onClose();
    };

    return (
        <form className="flex flex-col h-full" onSubmit={handleSubmit}>
            <div className="flex-grow flex flex-col gap-4 mt-2 divide-y-2 divide-zinc-700 overflow-y-auto pr-4">
                <div className="flex flex-col pb-4">
                    <h3 className="text-lg font-semibold">Configuração Básica</h3>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-zinc-300" htmlFor="hostname">Hostname</label>
                        <input
                            className="bg-gray-900 rounded-lg p-2 text-sm focus:outline-none"
                            type="text" placeholder="Ex: R-1" id="hostname"
                            value={hostname}
                            onChange={e => handleHostnameChange(e.target.value)}
                        />
                        {errors.hostname && <p className="text-red-400 text-sm">{errors.hostname}</p>}
                    </div>
                </div>

                <div className="flex flex-col pb-4">
                    <h3 className="text-lg font-semibold">Interfaces</h3>
                    <div className="flex flex-wrap gap-2">
                        {device.ports.map((port) => (
                            <InterfaceToConfig
                                key={port}
                                port={port}
                                device={device}
                                interfaceConfigs={interfaceConfigs}
                                onSubInterfaceChange={handleSubInterfaceChange}
                                allSortedVlans={allSortedVlans}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex flex-col pb-4">
                    <h3 className="text-lg font-semibold">DHCP</h3>
                    <div className="flex flex-wrap gap-2">
                        <DhcpExclusionConfig
                            autoExclusions={autoExclusions}
                            manualExclusions={manualExclusions}
                            onAddManualExclusion={handleAddManualExclusion}
                            onRemoveManualExclusion={handleRemoveManualExclusion}
                        />
                    </div>
                </div>
            </div>
            <footer>
                <button type="submit" className="absolute bottom-2.5 right-8 py-1 px-3 w-fit bg-green-500 rounded-md cursor-pointer hover:opacity-90">
                    Aplicar Configurações
                </button>
            </footer>
        </form>
    );
}