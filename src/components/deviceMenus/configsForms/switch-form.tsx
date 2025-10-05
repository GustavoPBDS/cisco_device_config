import { useScenario } from "@/contexts/scenario.context"
import { IPortModes, NetworkDeviceData } from "@/interfaces/devices"
import { FormEvent, useEffect, useMemo, useState } from "react"
import InterfaceToConfig from "./interface/interfaceToConfig"
import VlansContainer from "./vlan/vlans-container"
import { Node } from "reactflow"
import { toast } from "sonner"
import { Plus, X } from "lucide-react"
import ChannelGroup from "./interface/channel-group"
import { Switch } from "radix-ui"
import SpanningTreeConfig from "./vlan/spanning-tree-config"
import ManagementConfig from "./manager/management-container"

interface IProps {
    node: Node<NetworkDeviceData>
    onClose: () => void
}

export interface IVlan {
    id: string
    name: string
}

export interface IInterfaceConfig {
    mode?: IPortModes;
    accessVlan?: string;
    bpduGuard?: boolean;
    portfast?: boolean;
    trunkVlans?: string[];
    nativeVlan?: string;
}

export interface IChannelGroup {
    internalId: string;
    id: string;
    config?: IInterfaceConfig;
    interfaces: string[];
}

export default function SwitchForm({ node, onClose }: IProps) {
    const { devices, updateDeviceConfig } = useScenario()
    const device = devices.get(node.id)!

    const [hostname, setHostname] = useState(device.config?.hostname ?? "")
    const [managerIp, setManagerIp] = useState(device.config?.managementIp ?? "")
    const [vlans, setVlans] = useState<IVlan[]>(device.config?.vlans ?? [{ name: '', id: '' }])

    const [managementVlanId, setManagementVlanId] = useState(device.config?.managementVlanId ?? "")
    const [subnetMask, setSubnetMask] = useState(device.config?.subnetMask ?? "255.255.255.0")
    const [defaultGateway, setDefaultGateway] = useState(device.config?.defaultGateway ?? "")

    const [rapidStp, setRapidStp] = useState(device.config?.stp?.rapid ?? false)
    const [stpPrimaryVlans, setStpPrimaryVlans] = useState<string[]>(device.config?.stp?.primary ?? [])
    const [stpSecondaryVlans, setStpSecondaryVlans] = useState<string[]>(device.config?.stp?.secondary ?? [])


    const [interfaceConfigs, setInterfaceConfigs] = useState<Record<string, IInterfaceConfig>>(() => {
        const initialState: Record<string, IInterfaceConfig> = {};
        const interfaces = device.config?.interfaces ?? {};
        for (const port of device.ports) {
            initialState[port] = interfaces[port] ?? {};
        }
        return initialState;
    });

    const [channelGroups, setChannelGroups] = useState<IChannelGroup[]>(() => {
        const initialGroups = device.config?.channelGroups ?? [];
        return initialGroups.map((group: Omit<IChannelGroup, 'internalId'>) => ({
            ...group,
            internalId: crypto.randomUUID(),
        }));
    });

    const [errors, setErrors] = useState<Record<string, string>>({})


    useEffect(() => {
        if (node) {
            const currentDevice = devices.get(node.id);
            if (currentDevice) {
                // Resetar configurações básicas e de gerenciamento
                setHostname(currentDevice.config?.hostname ?? "");
                setManagerIp(currentDevice.config?.managementIp ?? "");
                setDefaultGateway(currentDevice.config?.defaultGateway ?? "");
                setManagementVlanId(currentDevice.config?.managementVlanId ?? "");
                setSubnetMask(currentDevice.config?.subnetMask ?? "255.255.255.0");

                // Resetar VLANs
                setVlans(currentDevice.config?.vlans ?? [{ name: '', id: '' }]);

                // Resetar Spanning Tree
                setRapidStp(currentDevice.config?.stp?.rapid ?? false);
                setStpPrimaryVlans(currentDevice.config?.stp?.primary ?? []);
                setStpSecondaryVlans(currentDevice.config?.stp?.secondary ?? []);

                // Resetar Channel Groups
                const initialGroups = currentDevice.config?.channelGroups ?? [];
                setChannelGroups(initialGroups.map((group: Omit<IChannelGroup, 'internalId'>) => ({
                    ...group,
                    internalId: crypto.randomUUID(),
                })));

                // Resetar configurações de interface
                const newInterfaceConfigs: Record<string, IInterfaceConfig> = {};
                const interfaces = currentDevice.config?.interfaces ?? {};
                for (const port of currentDevice.ports) {
                    newInterfaceConfigs[port] = interfaces[port] ?? {};
                }
                setInterfaceConfigs(newInterfaceConfigs);

                // Limpar erros
                setErrors({});
            }
        }
    }, [node, devices]);



    const validateHostname = (value: string) => {
        if (!value) return "Hostname é obrigatório";
        if (!/^[a-zA-Z0-9-]+$/.test(value)) return "Use apenas letras, números e hífens";
        return "";
    };

    const validateIp = (value: string) => {
        if (!value) return "";
        const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(value)) return "IP inválido";
        return "";
    };

    const validateVlans = (list: IVlan[]) => {
        if (list.length === 1 && !list[0].id && !list[0].name) return "";
        for (const vlan of list) {
            if (!vlan.id) return "VLAN ID é obrigatório";
            const num = Number(vlan.id);
            if (isNaN(num) || num < 1 || num > 4094) return "VLAN ID deve ser entre 1 e 4094";
            if (!vlan.name) return "Nome da VLAN é obrigatório";
        }
        return "";
    };

    const validateChannelGroups = (groups: IChannelGroup[]) => {
        const ids = new Set<string>();
        for (const group of groups) {
            if (!group.id) return "O ID do Channel Group é obrigatório.";
            if (ids.has(group.id)) return `ID de Channel Group duplicado: ${group.id}.`;
            if (isNaN(Number(group.id))) return `O ID (${group.id}) deve ser um número.`;
            ids.add(group.id);

            if (group.interfaces.length < 2) {
                return `O Channel Group ${group.id} deve ter pelo menos 2 interfaces.`;
            }
        }
        return "";
    };

    const handleChange = (field: string, value: string) => {
        let error = "";
        if (field === "hostname") { setHostname(value); error = validateHostname(value); }
        if (field === "managerIp") { setManagerIp(value); error = validateIp(value); }
        setErrors(prev => ({ ...prev, [field]: error }));
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        const hostError = validateHostname(hostname);
        const ipError = validateIp(managerIp);
        const vlanError = validateVlans(vlans);
        const channelGroupError = validateChannelGroups(channelGroups);
        const gatewayError = validateIp(defaultGateway)
        const managementVlanError = (managerIp && !managementVlanId) ? "VLAN de Gerenciamento é obrigatória." : "";

        setErrors({
            hostname: hostError,
            managerIp: ipError,
            vlans: vlanError,
            channelGroups: channelGroupError,
            defaultGateway: gatewayError,
            managementVlan: managementVlanError
        });

        if (hostError || ipError || vlanError || channelGroupError || managementVlanError) {
            toast.error("Corrija os erros antes de salvar.");
            return;
        }

        const finalChannelGroups = channelGroups;

        const config = {
            hostname,
            defaultGateway,
            managementIp: managerIp,
            subnetMask,
            managementVlanId: managementVlanId,
            vlans: vlans.filter(v => v.id && v.name),
            interfaces: interfaceConfigs,
            channelGroups: finalChannelGroups,
            stp: {
                rapid: rapidStp,
                primary: stpPrimaryVlans,
                secondary: stpSecondaryVlans,
            }
        };

        updateDeviceConfig(node.id, config);
        toast.success('Configuração salva!');
        onClose();
    };

    const validVlans = vlans.filter(v => v.id && v.name);

    return (
        <form className="flex flex-col h-full" onSubmit={handleSubmit}>
            <div className="flex-grow flex flex-col gap-4 mt-2 divide-y-2 divide-zinc-700 overflow-y-auto pr-4">
                {/* configuração basica */}
                <div className="flex flex-col pb-4">
                    <h3 className="text-lg font-semibold">Configuração Básica</h3>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-zinc-300" htmlFor="hostname">Hostname</label>
                        <input
                            className="bg-gray-900 rounded-lg p-2 text-sm focus:outline-none"
                            type="text" placeholder="Ex: SW-1" id="hostname"
                            value={hostname} onChange={e => handleChange("hostname", e.target.value)}
                        />
                        {errors.hostname && <p className="text-red-400 text-sm">{errors.hostname}</p>}
                    </div>

                </div>
                {/* vlans */}
                <div className="flex flex-col pb-4">
                    <h3 className="text-lg font-semibold">VLANs</h3>
                    <VlansContainer vlans={vlans} setVlans={setVlans} />
                    {errors.vlans && <p className="text-red-400 text-sm">{errors.vlans}</p>}
                </div>

                {/* channel groups */}
                <div className="flex flex-col pb-4">
                    <h3 className="text-lg font-semibold">Channel Groups</h3>
                    <div className="flex flex-col gap-4">
                        <ChannelGroup
                            channelGroups={channelGroups}
                            device={device}
                            errors={errors}
                            setChannelGroups={setChannelGroups}
                            interfaceConfigs={interfaceConfigs}
                            setInterfaceConfigs={setInterfaceConfigs}
                            vlans={vlans}
                        />
                    </div>
                </div>

                {/* interfaces */}
                <div className="flex flex-col pb-4">
                    <h3 className="text-lg font-semibold">Interfaces</h3>
                    <div className="flex flex-wrap gap-2">
                        {device.ports.map((port, i) => (
                            <InterfaceToConfig
                                key={i} port={port} device={device} vlans={vlans}
                                interfaceConfigs={interfaceConfigs} setInterfaceConfigs={setInterfaceConfigs}
                            />
                        ))}
                    </div>
                </div>

                {/* spaningtree */}
                <div className="flex flex-col pb-4">
                    <h3 className="text-lg font-semibold">Spanning Tree Protocol</h3>
                    <div className="flex flex-wrap gap-2">
                        <div className="flex gap-3 items-center">
                            <label className="text-sm text-zinc-300" htmlFor="handleStpMode">Habilitar modo Rapid-PVST</label>

                            <Switch.Root
                                className="relative h-[22px] w-[45px] cursor-pointer rounded-full outline-none  bg-zinc-600 data-[state=checked]:bg-sky-500"
                                id="handleStpMode"
                                aria-checked={rapidStp}
                                checked={rapidStp}
                                onClick={() => setRapidStp(state => !state)}
                            >
                                <Switch.Thumb
                                    className="block size-[15px] translate-x-1 shadow-zinc-500 shadow-sm rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[25px]"
                                />
                            </Switch.Root>

                        </div>
                        <SpanningTreeConfig
                            allVlans={vlans.filter(v => v.id && v.name)}
                            primaryVlans={stpPrimaryVlans}
                            setPrimaryVlans={setStpPrimaryVlans}
                            secondaryVlans={stpSecondaryVlans}
                            setSecondaryVlans={setStpSecondaryVlans}
                        />
                    </div>
                </div>

                {/* gerenciamento */}
                <div className="flex flex-col">
                    <h3 className="text-lg font-semibold">Gerenciamento</h3>
                    <ManagementConfig
                        managerIp={managerIp}
                        setManagerIp={setManagerIp}
                        subnetMask={subnetMask}
                        setSubnetMask={setSubnetMask}
                        defaultGateway={defaultGateway}
                        setDefaultGateway={setDefaultGateway}
                        managementVlanId={managementVlanId}
                        setManagementVlanId={setManagementVlanId}
                        vlans={validVlans}
                        errors={errors}
                    />
                </div>


            </div>
            <footer>
                <button
                    type="submit"
                    className="absolute bottom-2.5 right-8 py-1 px-3 w-fit bg-green-500 rounded-md cursor-pointer hover:opacity-90"
                >
                    Aplicar Configurações
                </button>
            </footer>
        </form>
    );
}