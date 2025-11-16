'use client'
import { useScenario } from "@/contexts/scenario.context";
import { NetworkDeviceData } from "@/interfaces/devices";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Node } from "reactflow";
import { toast } from "sonner";

interface IProps {
    node: Node<NetworkDeviceData>
    onClose: () => void
}

export default function PcForm({ node, onClose }: IProps) {
    const { devices, updateDeviceConfig, requestDhcpLease } = useScenario()

    const [device, setDevice] = useState<NetworkDeviceData>()

    const [ipv4Mode, setIpv4Mode] = useState(device?.config?.ipv4Mode ?? "static");
    const [ipv4, setIpv4] = useState(device?.config?.ipv4 ?? "");
    const [ipv4Mask, setIpv4Mask] = useState(device?.config?.ipv4Mask ?? "");

    const id = node.id

    useEffect(() => {
        if (node) {
            const temp = devices.get(node.id)
            setDevice(temp)
            setIpv4Mode(temp?.config?.ipv4Mode ?? "static");
            setIpv4(temp?.config?.ipv4 ?? "");
            setIpv4Mask(temp?.config?.ipv4Mask ?? "");
        }
    }, [node])

    const findVlanGatewayAndDhcpServer = (pcId: string) => {
        const pc = devices.get(pcId);
        if (!pc || pc.portsConnected.size === 0) {
            console.log("PC não encontrado ou não conectado.");
            return null;
        }

        // --- Etapa 1: Encontrar a VLAN de acesso do PC ---
        const connection = pc.portsConnected.values().next().value;
        const switchId = connection?.deviceConnected;
        const portOnSwitch = connection?.deviceConnectedPort;

        const connectedSwitch = devices.get(switchId!);
        if (!connectedSwitch || connectedSwitch.type !== 'switch') {
            return null;
        }

        const switchPortConfig = connectedSwitch.config?.interfaces?.[portOnSwitch!];
        const targetVlanId = switchPortConfig?.mode === 'access' ? switchPortConfig.accessVlan : null;

        if (!targetVlanId) {
            return null;
        }


        // --- Etapa 2: Navegar pela rede recursivamente a partir do switch inicial ---
        const findRouterForVlan = (currentDeviceId: string, vlanId: string, visited: Set<string>): { gatewayIp: string, dhcpServer: NetworkDeviceData, vlanId: string } | null => {
            if (visited.has(currentDeviceId)) return null;
            visited.add(currentDeviceId);

            const currentDevice = devices.get(currentDeviceId);
            if (!currentDevice) return null;

            for (const [edgeId, connInfo] of currentDevice.portsConnected.entries()) {
                const neighborDevice = devices.get(connInfo.deviceConnected);
                if (!neighborDevice) continue;

                const localPortConfig = currentDevice.config?.interfaces?.[connInfo.port];

                // A conexão deve ser um TRUNK que permite a passagem da nossa VLAN
                const isTrunkAllowed = localPortConfig?.mode === 'trunk' &&
                    (localPortConfig.trunkVlans?.includes(vlanId) || localPortConfig.nativeVlan === vlanId);

                if (isTrunkAllowed) {
                    // --- Etapa 3: Validar se o vizinho é o Roteador correto ---
                    if (neighborDevice.type === 'router' && neighborDevice.config?.dhcpExcluded) {
                        // Verifica as sub-interfaces do roteador
                        for (const iface of Object.values(neighborDevice.config?.interfaces || {})) {
                            // A chave da sub-interface é o ID da VLAN. Ex: '10', '20'
                            const subInterface = iface.subInterfaces?.[vlanId];
                            if (subInterface && subInterface.ip) {
                                return { gatewayIp: subInterface.ip, dhcpServer: neighborDevice, vlanId };
                            }
                        }
                    }

                    // Se o vizinho for outro switch, continue a busca
                    if (neighborDevice.type === 'switch') {
                        const result = findRouterForVlan(connInfo.deviceConnected, vlanId, visited);
                        if (result) return result; // Propaga o resultado encontrado
                    }
                }
            }
            return null;
        };

        return findRouterForVlan(switchId!, targetVlanId, new Set([pcId]));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (ipv4Mode === 'static') {
            updateDeviceConfig(id, { ipv4Mode, ipv4, ipv4Mask });
            toast.success('Configuração salva!');
            onClose();
        } else {
            const result = findVlanGatewayAndDhcpServer(id);

            if (result && result.gatewayIp && result.dhcpServer) {
                const newIp = requestDhcpLease(id, result.dhcpServer, result.vlanId);
                if (newIp) {
                    updateDeviceConfig(id, {
                        ipv4Mode,
                        ipv4: newIp.assignedIp,
                        ipv4Mask: newIp.subnetMask
                    });
                    toast.success('Configuração salva!');
                    onClose();
                } else {
                    updateDeviceConfig(id, { ipv4Mode, ipv4: undefined, ipv4Mask: undefined });
                    toast.warning('Não foi possível obter um endereço IP. O pool de DHCP pode estar cheio.')
                    onClose()
                }
            } else {
                // Falha: Nenhum gateway/servidor DHCP encontrado para a VLAN do PC.
                updateDeviceConfig(id, {
                    ipv4Mode,
                    ipv4: undefined,
                    ipv4Mask: undefined
                });
                toast.warning('Servidor não encontrado');
                onClose();
            }
        }
    };

    return (
        <form className="flex flex-col h-full" onSubmit={handleSubmit}>
            <div className="flex-grow flex flex-col gap-4 mt-2 divide-y-2 divide-zinc-700 overflow-y-auto pr-4">
                <div className="pb-4 w-full p-2">
                    <h2 className="font-semibold mb-2">Gateway/DNS IPv4</h2>
                    <div className="flex items-center gap-4 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                value="dhcp"
                                checked={ipv4Mode === "dhcp"}
                                onChange={() => setIpv4Mode("dhcp")}
                            />
                            DHCP
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                value="static"
                                checked={ipv4Mode === "static"}
                                onChange={() => setIpv4Mode("static")}
                            />
                            Static
                        </label>
                    </div>
                    <div className="space-y-2">
                        <div>
                            <label className="block text-sm" htmlFor="ipv4-gateway">Endereço IPV4</label>
                            <input
                                type="text"
                                value={ipv4}
                                id="ipv4-gateway"
                                onChange={(e) => setIpv4(e.target.value)}
                                disabled={ipv4Mode === "dhcp"}
                                className="w-full bg-gray-900 rounded-lg p-2 text-sm focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm" htmlFor="ipv4-dns">Mascara de Sub-Rede</label>
                            <input
                                type="text"
                                id="ipv4-dns"
                                value={ipv4Mask}
                                onChange={(e) => setIpv4Mask(e.target.value)}
                                disabled={ipv4Mode === "dhcp"}
                                className="w-full bg-gray-900 rounded-lg p-2 text-sm focus:outline-none"
                            />
                        </div>
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
