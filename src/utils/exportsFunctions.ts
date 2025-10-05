import { NetworkDeviceData } from "@/interfaces/devices";
import { getNetworkInfo } from "./calcs-ips";
import { IRouterInterfaceConfig, IRouterSubInterfaceConfig } from "@/components/deviceMenus/configsForms/router-form";

export const exportSwitchConfig = (device: NetworkDeviceData, output: string) => {

    const config = device.config!

    if (config.stp) {
        if (config.stp.rapid) {
            output += `spanning-tree mode rapid-pvst\n`;
        } else {
            output += `spanning-tree mode pvst\n`;
        }

        if (config.stp.primary && config.stp.primary.length > 0) {
            const vlanList = config.stp.primary.join(',');
            output += `spanning-tree vlan ${vlanList} root primary\n`;
        }

        if (config.stp.secondary && config.stp.secondary.length > 0) {
            const vlanList = config.stp.secondary.join(',');
            output += `spanning-tree vlan ${vlanList} root secondary\n`;
        }
    }
    output += `!\n`

    config.vlans?.forEach(vlan => {
        if (vlan.id && vlan.name) {
            output += `vlan ${vlan.id}\n name ${vlan.name}\n!\n`;
        }
    });

    if (config.managementIp && config.managementVlanId && config.subnetMask) {
        output += `interface Vlan${config.managementVlanId}\n`;
        output += ` description Interface de Gerenciamento\n`;
        output += ` ip address ${config.managementIp} ${config.subnetMask}\n`;
        output += ` no shutdown\n`;
        output += `!\n`;
    }

    type InterfaceConfig = {
        isUp?: boolean;
        mode?: "access" | "trunk";
        accessVlan?: string;
        trunkVlans?: string[];
        nativeVlan?: string;
        bpduGuard?: boolean;
        portfast?: boolean;
    };

    const generateL2Config = (cfg: InterfaceConfig) => {
        let l2Output = "";
        if (cfg.mode === "access") {
            l2Output += ` switchport mode access\n switchport access vlan ${cfg.accessVlan}\n`;
            if (cfg.portfast) l2Output += " spanning-tree portfast\n";
            if (cfg.bpduGuard) l2Output += " spanning-tree bpduguard enable\n";
        } else if (cfg.mode === "trunk") {
            l2Output += " switchport mode trunk\n";
            if (cfg.trunkVlans?.length) {
                l2Output += ` switchport trunk allowed vlan ${cfg.trunkVlans.join(",")}\n`;
            }
            if (cfg.nativeVlan) {
                l2Output += ` switchport trunk native vlan ${cfg.nativeVlan}\n`;
            }
        }
        return l2Output;
    }

    if (config.interfaces) {
        const portToGroupMap = new Map<string, string>();
        config.channelGroups?.forEach(group => {
            group.interfaces.forEach(port => {
                portToGroupMap.set(port, group.id);
            });
        });

        Object.entries(config.interfaces).forEach(([port, cfg]) => {
            output += `interface ${port}\n`;
            const groupId = portToGroupMap.get(port);

            if (groupId) {
                output += ` channel-group ${groupId} mode active\n`;
            }

            output += generateL2Config(cfg);

            if (cfg.isUp) {
                output += ` no shutdown\n`;
            }
            output += "!\n";
        });
    }

    if (config.channelGroups) {
        config.channelGroups.forEach(group => {
            if (group.config && group.id) {
                output += `interface Port-channel ${group.id}\n`;
                output += generateL2Config(group.config);
                output += " no shutdown\n";
                output += "!\n";
            }
        });
    }

    return output
}

type CombinedInterfaceConfig = IRouterInterfaceConfig & {
    subInterfaces?: Record<string, IRouterSubInterfaceConfig>;
};

export const exportRouterConfig = (device: NetworkDeviceData, output: string) => {
    const config = device.config;
    if (!config) return output;

    const allSubInterfaces: { vlanId: string, cfg: IRouterSubInterfaceConfig }[] = [];

    // --- Passo 1: Coletar todas as sub-interfaces de todas as portas ---
    if (config.interfaces) {
        Object.values(config.interfaces as Record<string, CombinedInterfaceConfig>).forEach(iface => {
            if (iface.subInterfaces) {
                Object.entries(iface.subInterfaces).forEach(([vlanId, subCfg]) => {
                    // Adicionar apenas se tiver uma configuração de IP válida
                    if (subCfg.ip && subCfg.subnetMask) {
                        allSubInterfaces.push({ vlanId, cfg: subCfg });
                    }
                });
            }
        });
    }

    // Ordenar pela VLAN ID para uma configuração limpa
    allSubInterfaces.sort((a, b) => parseInt(a.vlanId) - parseInt(b.vlanId));

    if (config.dhcpExcluded && config.dhcpExcluded.length > 0) {
        output += "!\n";
        config.dhcpExcluded.forEach((ip) => {
            output += `ip dhcp excluded-address ${ip}\n`;
        });
    }

    if (allSubInterfaces.length > 0) {
        output += "!\n";
        allSubInterfaces.forEach(({ vlanId, cfg }) => {
            const netInfo = getNetworkInfo(cfg.ip!, cfg.subnetMask!);
            if (netInfo) {
                output += `ip dhcp pool LAN-POOL-VLAN-${vlanId}\n`;
                output += ` network ${netInfo.networkAddress} ${cfg.subnetMask}\n`;
                output += ` default-router ${cfg.ip}\n`;
                output += "!\n";
            }
        });
    }

    // --- Passo 4: Gerar a configuração das Interfaces e Sub-interfaces ---
    if (config.interfaces) {
        output += "!\n";
        // Ordenar as portas para uma saída consistente (ex: G0/0 antes de G0/1)
        const sortedPorts = Object.keys(config.interfaces).sort();

        sortedPorts.forEach(port => {
            const cfg = (config.interfaces as Record<string, CombinedInterfaceConfig>)[port];

            // Configuração da interface física
            output += `interface ${port}\n`;
            if (cfg.description) {
                output += ` description ${cfg.description}\n`;
            }
            // Se a porta tem sub-interfaces, ela não deve ter IP
            if (cfg.subInterfaces && Object.keys(cfg.subInterfaces).length > 0) {
                output += ` no ip address\n`;
            } else if (cfg.ip && cfg.subnetMask) {
                output += ` ip address ${cfg.ip} ${cfg.subnetMask}\n`;
            }
            output += ` no shutdown\n`; // Portas de roteador geralmente ficam ativas
            output += "!\n";

            // Configuração das sub-interfaces (Router on a Stick)
            if (cfg.subInterfaces) {
                const sortedVlans = Object.keys(cfg.subInterfaces).sort((a, b) => parseInt(a) - parseInt(b));
                sortedVlans.forEach(vlanId => {
                    const subCfg = cfg.subInterfaces![vlanId];
                    if (subCfg.ip && subCfg.subnetMask) {
                        output += `interface ${port}.${vlanId}\n`;
                        output += ` encapsulation dot1Q ${vlanId}\n`;
                        output += ` ip address ${subCfg.ip} ${subCfg.subnetMask}\n`;
                        output += ` no shutdown\n`;
                        output += "!\n";
                    }
                });
            }
        });
    }
    return output;
};

export const exportPcConfig = (device: NetworkDeviceData, output: string) => {
    if (device.config?.ipv4 && device.config.ipv4Mask) {
        output += `ip address ${device.config.ipv4} ${device.config.ipv4Mask}`
    }
    return output
}