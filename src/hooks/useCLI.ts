import { IChannelGroup } from "@/components/deviceMenus/configsForms/switch-form";
import { useScenario } from "@/contexts/scenario.context";
import { IAccessList, IAclRule, IOspfConfig, IStaticRoute, NetworkDeviceData, IPortModes, IBgpConfig, IBgpNeighbor } from "@/interfaces/devices";
import { useEffect, useState } from "react";
import { Node } from "reactflow";

// --- ATUALIZADO: Adicionado novos modos de configuração ---
type CliMode = 'exec' | 'privileged' | 'config' | 'config-vlan' | 'config-if' | 'config-subif' | 'config-router' | 'config-std-nacl' | 'config-router-bgp';

type CommandTree = { [key: string]: CommandTree | null };

const commands: Record<CliMode, CommandTree> = {
    'exec': {
        'enable': null,
    },
    'privileged': {
        'disable': null,
        'configure': {
            'terminal': null
        },
        'show': {
            'running-config': null,
            'ip': {
                'route': null,
                'ospf': null,
                'access-lists': null
            }
        }
    },
    'config': {
        'hostname': null,
        'interface': null,
        'vlan': null,
        'spanning-tree': {
            'mode': {
                'rapid-pvst': null
            },
            'vlan': null,
        },
        // --- NOVO: Comandos de config global ---
        'router': {
            'ospf': null
        },
        'ip': {
            'route': null,
        },
        'access-list': null,
        'exit': null,
    },
    'config-vlan': {
        'name': null,
        'exit': null
    },
    'config-if': {
        'shutdown': null,
        'description': null,
        'ip': {
            'address': null,
            'add': null
        },
        'switchport': {
            'mode': {
                'access': null,
                'trunk': null
            },
            'access': {
                'vlan': null
            },
            'trunk': {
                'native': {
                    'vlan': null
                },
                'allowed': {
                    'vlan': {
                        'address': null,
                        'remove': null
                    }
                }
            }
        },
        'spanning-tree': {
            'portfast': null,
            'bpduguard': {
                'enable': null
            }
        },
        'channel-group': null,
        'exit': null
    },
    'config-subif': {
        'shutdown': null,
        'shut': null,
        'description': null,
        'desc': null,
        'encapsulation': {
            'dot1q': null,
        },
        'ip': {
            'address': null,
            'add': null
        },
        'exit': null
    },
    // --- NOVO: Modos de configuração OSPF e ACL ---
    'config-router': {
        'network': null,
        'exit': null,
    },
    'config-std-nacl': {
        'permit': null,
        'deny': null,
        'exit': null
    },
    'config-router-bgp': {
        'neighbor': null,
        'exit': null,
    }
}

export default function useCiscoCli(node: Node<NetworkDeviceData>) {
    const { devices, updateDeviceConfig } = useScenario()
    const device = devices.get(node.id)
    const [lines, setLines] = useState<string[]>(["Welcome to Cisco CLI Simulator."]);
    const [input, setInput] = useState("");
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [mode, setMode] = useState<CliMode>('exec');
    const [hostname, setHostname] = useState(device?.config?.hostname || device?.label || "Device");

    // --- ATUALIZADO: Novos estados para sub-modos ---
    const [currentInterface, setCurrentInterface] = useState<string | null>(null);
    const [currentVlanId, setCurrentVlanId] = useState<string | null>(null)
    const [currentOspfProcessId, setCurrentOspfProcessId] = useState<string | null>(null);
    const [currentAclId, setCurrentAclId] = useState<string | null>(null);
    const [currentBgpAs, setCurrentBgpAs] = useState<string | null>(null)


    useEffect(() => {
        if (node) {
            setHostname(node.data?.config?.hostname || node.data?.label || "Device");
            setMode('exec');
            setCurrentInterface(null);
            setCurrentVlanId(null);
            setCurrentOspfProcessId(null);
            setCurrentBgpAs(null);
            setCurrentAclId(null);
            setLines(["Welcome to Cisco CLI Simulator."]);
            setHistory([]);
            setHistoryIndex(-1);
        }
    }, [node?.id]);

    useEffect(() => {
        if (device) {
            setHostname(device.config?.hostname || device.label || "Device");
        }
    }, [device?.config?.hostname, device?.label]);


    function prompt() {
        if (!device) return '> ';
        // --- ATUALIZADO: Prompt para novos modos ---
        const modeSymbol: Record<CliMode, string> = {
            'exec': '>',
            'privileged': '#',
            'config': '(config)#',
            'config-vlan': '(config-vlan)#',
            'config-if': '(config-if)#',
            'config-subif': '(config-subif)#',
            'config-router': '(config-router)#',
            'config-std-nacl': '(config-std-nacl)#',
            'config-router-bgp': '(config-router-bgp)#'
        };
        return `${hostname}${modeSymbol[mode]} `;
    }

    function expandInterfaceName(shortcut: string): string | null {
        if (!device) return null;
        const subInterfaceParts = shortcut.split('.');
        const physicalShortcut = subInterfaceParts[0];
        const subInterfaceId = subInterfaceParts.length > 1 ? subInterfaceParts[1] : null;

        const firstDigitIndex = physicalShortcut.search(/\d/);
        if (firstDigitIndex === -1) return null;

        const letterPart = physicalShortcut.substring(0, firstDigitIndex).toLowerCase();
        const numberPart = physicalShortcut.substring(firstDigitIndex);

        const fullPhysicalName = device.ports.find(port => {
            const parts = port.split(' ');
            if (parts.length < 2) return false;

            const portLetterPart = parts[0].toLowerCase();
            const portNumberPart = parts.slice(1).join(' ');

            return portLetterPart.startsWith(letterPart) && portNumberPart === numberPart;
        });

        if (!fullPhysicalName) {
            return null;
        }
        return subInterfaceId ? `${fullPhysicalName}.${subInterfaceId}` : fullPhysicalName;
    }

    function parseVlanList(vlanString: string): string[] {
        const vlans = new Set<string>();
        vlanString.split(',').forEach(part => {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                for (let i = start; i <= end; i++) {
                    vlans.add(String(i));
                }
            } else {
                vlans.add(part);
            }
        });
        return Array.from(vlans);
    }

    function appendLine(text: string) {
        setLines(prev => [...prev, text]);
    }

    function handleCommand(raw: string) {
        const cmd = raw.trim();
        if (!cmd) return;

        appendLine(prompt() + cmd);
        const output = executeCommand(cmd);
        if (output) appendLine(output);

        if (cmd) {
            setHistory(h => [cmd, ...h]);
        }
        setHistoryIndex(-1);
    }

    function executeCommand(cmd: string): string | void {
        if (!node || !device) return "% No device selected.";

        const tokens = cmd.split(/\s+/);
        const isNegated = tokens[0]?.toLowerCase() === 'no';
        const commandTokens = isNegated ? tokens.slice(1) : tokens;
        const [t0, t1, t2, ...rest] = commandTokens;

        const updateConfig = (newConfig: Partial<NetworkDeviceData['config']>) => {
            updateDeviceConfig(node.id, { ...device.config, ...newConfig });
        };

        if (t0 === 'exit') {
            // --- ATUALIZADO: Lógica de saída para novos modos ---
            if (['config-if', 'config-subif', 'config-vlan', 'config-router', 'config-std-nacl'].includes(mode)) {
                setMode('config');
                setCurrentInterface(null);
                setCurrentVlanId(null);
                setCurrentOspfProcessId(null);
                setCurrentBgpAs(null)
                setCurrentAclId(null);
            } else if (mode === 'config') {
                setMode('privileged');
            } else if (mode === 'privileged') {
                setMode('exec');
            }
            return;
        }

        if (mode === 'exec') {
            if (t0 === 'enable' || t0 === 'en') {
                setMode('privileged');
                return;
            }
        }

        if (mode === 'privileged') {
            if (t0 === 'disable') {
                setMode('exec');
                return;
            }
            if (t0 === 'configure' && t1 === 'terminal' || t0 === 'conf' && t1 === 't') {
                setMode('config');
                return 'Enter configuration commands, one per line.  End with CNTL/Z.';
            }
            if (t0 === 'show' && t1 === 'running-config') {
                return JSON.stringify(device.config, null, 2);
            }
            // --- NOVO: Comandos 'show' adicionais ---
            if (t0 === 'show' && t1 === 'ip') {
                if (t2 === 'route') return JSON.stringify({ static: device.config?.staticRoutes, ospf: device.config?.ospf }, null, 2);
                if (t2 === 'ospf') return JSON.stringify(device.config?.ospf, null, 2);
                if (t2 === 'access-lists') return JSON.stringify(device.config?.accessLists, null, 2);
            }
        }

        if (mode === 'config') {
            if (t0 === 'hostname' && t1) {
                setHostname(t1);
                updateConfig({ hostname: t1 });
                return;
            }
            // --- INÍCIO: NOVOS COMANDOS (ROUTER) ---
            if (device.type === 'router') {
                if (t0 === 'ip' && t1 === 'route' && t2 && rest[0] && rest[1]) {
                    const [network, subnetMask, nextHop] = [t2, rest[0], rest[1]];
                    const staticRoutes: IStaticRoute[] = JSON.parse(JSON.stringify(device.config?.staticRoutes || []));
                    const routeId = `${network}/${subnetMask}`;

                    if (isNegated) {
                        const newRoutes = staticRoutes.filter(r => r.id !== routeId || r.nextHop !== nextHop);
                        if (newRoutes.length === staticRoutes.length) return `% Route to ${network} via ${nextHop} not found.`;
                        updateConfig({ staticRoutes: newRoutes });
                        return;
                    }

                    if (staticRoutes.some(r => r.id === routeId && r.nextHop === nextHop)) return `% Route to ${network} via ${nextHop} already exists.`;
                    staticRoutes.push({ id: routeId, network, subnetMask, nextHop });
                    updateConfig({ staticRoutes });
                    return;
                }
                if (t0 === 'router' && t1 === 'ospf' && t2) {
                    if (isNegated) {
                        if (device.config?.ospf?.processId === t2) {
                            const { ospf, ...restConfig } = device.config;
                            updateDeviceConfig(node.id, restConfig); // Remove o objeto OSPF
                        }
                        return;
                    }
                    if (device.config?.ospf && device.config.ospf.processId !== t2) {
                        return `% OSPF process ${device.config.ospf.processId} is already running.`;
                    }
                    const ospfConfig: IOspfConfig = device.config?.ospf || { processId: t2, networks: [] };
                    updateConfig({ ospf: ospfConfig });
                    setCurrentOspfProcessId(t2);
                    setMode('config-router');
                    return;
                }
                if (t0 === 'access-list' && t1) {
                    const aclId = t1;
                    const aclNum = parseInt(aclId, 10);
                    if (isNaN(aclNum) || aclNum < 1 || aclNum > 99) {
                        return '% Invalid access list number.';
                    }

                    const accessLists: IAccessList[] = JSON.parse(JSON.stringify(device.config?.accessLists || []));

                    if (isNegated) {
                        // O comando "no access-list <id>" remove a ACL inteira.
                        const newAcls = accessLists.filter(acl => acl.id !== aclId);
                        if (newAcls.length === accessLists.length) return `% Access list ${aclId} not configured.`;
                        updateConfig({ accessLists: newAcls });
                        return;
                    }

                    // Se houver mais tokens (permit/deny), é um comando de linha única que não deveria estar aqui.
                    if (t2) {
                        return '% Incomplete command. Use this command to enter ACL configuration mode.';
                    }

                    // Entrar no modo de sub-configuração da ACL
                    const existingAcl = accessLists.find(acl => acl.id === aclId);
                    if (!existingAcl) {
                        accessLists.push({ id: aclId, rules: [] });
                        updateConfig({ accessLists });
                    }
                    setCurrentAclId(aclId);
                    setMode('config-std-nacl');
                    return;
                }
                if (t0 === 'router' && t1 === 'bgp' && t2) {
                    const asNumber = t2;
                    if (isNegated) {
                        if (device.config?.bgp?.asNumber === asNumber) {
                            const { bgp, ...restConfig } = device.config;
                            updateDeviceConfig(node.id, restConfig);
                        }
                        return;
                    }
                    if (device.config?.bgp && device.config.bgp.asNumber !== asNumber) {
                        return `% BGP process ${device.config.bgp.asNumber} is already running.`;
                    }
                    const bgpConfig: IBgpConfig = device.config?.bgp || { asNumber, neighbors: [] };
                    updateConfig({ bgp: bgpConfig });
                    setCurrentBgpAs(asNumber);
                    setMode('config-router-bgp');
                    return;
                }
            }
            // --- FIM: NOVOS COMANDOS (ROUTER) ---

            if (t0 === 'vlan' && t1) {
                const vlans = device.config?.vlans || [];
                if (isNegated) {
                    updateConfig({ vlans: vlans.filter(v => v.id !== t1) });
                    return `VLAN ${t1} removed.`;
                }
                const existing = vlans.find(v => v.id === t1);
                if (!existing) {
                    vlans.push({ id: t1, name: `VLAN${t1}` });
                    updateConfig({ vlans });
                }
                setCurrentVlanId(t1);
                setMode('config-vlan');
                return;
            }
            if ((t0 === 'spanning-tree' || t0 === 'spa') && t1 === 'mode' && (t2 === 'rapid-pvst' || t2 === 'r')) {
                const stpConfig = device.config?.stp || { rapid: false, primary: [], secondary: [] };
                stpConfig.rapid = !isNegated;
                updateConfig({ stp: stpConfig });
                return;
            }
            if ((t0 === 'spanning-tree' || t0 === 'spa') && t1 === 'vlan' && t2) {
                const vlanList = parseVlanList(t2);
                const stpConfig = device.config?.stp || { rapid: false, primary: [], secondary: [] };
                const isPrimary = rest.join(' ') === 'root primary';
                const isSecondary = rest.join(' ') === 'root secondary';

                if (!isPrimary && !isSecondary) return '% Incomplete command.';

                let primaryVlans = new Set(stpConfig.primary);
                let secondaryVlans = new Set(stpConfig.secondary);

                if (isNegated) {
                    vlanList.forEach(v => {
                        if (isPrimary) primaryVlans.delete(v);
                        if (isSecondary) secondaryVlans.delete(v);
                    });
                } else {
                    vlanList.forEach(v => {
                        if (isPrimary) {
                            primaryVlans.add(v);
                            secondaryVlans.delete(v);
                        }
                        if (isSecondary) {
                            secondaryVlans.add(v);
                            primaryVlans.delete(v);
                        }
                    });
                }
                updateConfig({ stp: { ...stpConfig, primary: Array.from(primaryVlans), secondary: Array.from(secondaryVlans) } });
                return;
            }
            if ((t0 === 'interface' || t0 === 'inter') && t1) {
                if (t1.toLowerCase() === 'vlan' && t2) {
                    const vlanId = t2;
                    setCurrentInterface(`Vlan${vlanId}`);
                    setMode('config-if');
                    return;
                }
                const fullName = expandInterfaceName(t1);
                if (fullName) {
                    setCurrentInterface(fullName);
                    setMode(fullName.includes('.') ? 'config-subif' : 'config-if');
                    return;
                }

                return '% Invalid interface type and number.';
            }
        }

        // --- NOVO: MODO DE CONFIGURAÇÃO OSPF ---
        if (mode === 'config-router') {
            if (!currentOspfProcessId) return "% Internal error: No OSPF process selected.";

            if (t0 === 'network' && t1 && t2 && commandTokens[3] === 'area' && commandTokens[4]) {
                const [ip, wildcard, area] = [t1, t2, commandTokens[4]];
                const ospfConfig = JSON.parse(JSON.stringify(device.config?.ospf!));
                const networkId = `${ip}/${wildcard}/${area}`;

                if (isNegated) {
                    ospfConfig.networks = ospfConfig.networks.filter((n: any) => n.id !== networkId);
                } else {
                    if (!ospfConfig.networks.some((n: any) => n.id === networkId)) {
                        ospfConfig.networks.push({ id: networkId, ip, wildcard, area });
                    }
                }
                updateConfig({ ospf: ospfConfig });
                return;
            }
        }
        if (mode === 'config-router-bgp') {
            if (!currentBgpAs) return "% Internal error: No BGP process selected.";

            // Comando: neighbor <ip> remote-as <remote-as>
            if (t0 === 'neighbor' && t1 && t2 === 'remote-as' && rest[0]) {
                const neighborIp = t1;
                const remoteAs = rest[0];
                const bgpConfig = JSON.parse(JSON.stringify(device.config?.bgp!));

                if (isNegated) {
                    bgpConfig.neighbors = bgpConfig.neighbors.filter((n: IBgpNeighbor) => n.ip !== neighborIp);
                } else {
                    // Remove qualquer vizinho antigo com o mesmo IP antes de adicionar o novo
                    bgpConfig.neighbors = bgpConfig.neighbors.filter((n: IBgpNeighbor) => n.ip !== neighborIp);
                    bgpConfig.neighbors.push({ id: neighborIp, ip: neighborIp, remoteAs });
                }
                updateConfig({ bgp: bgpConfig });
                return;
            }
        }
        if (mode === 'config-std-nacl') {
            if (!currentAclId) return "% Internal error: No ACL context.";

            const action = isNegated ? t1 : t0;
            if (action !== 'permit' && action !== 'deny') {
                return `% Invalid command. Expecting 'permit' or 'deny'.`;
            }

            const ruleTokens = isNegated ? commandTokens.slice(1) : commandTokens.slice(1);
            let [sourceIp, sourceWildcard] = ruleTokens;

            if (!sourceIp) return '% Incomplete command.';

            // Tratar palavras-chave 'host' e 'any'
            if (sourceIp.toLowerCase() === 'host') {
                sourceIp = sourceWildcard; // O IP vem depois de 'host'
                sourceWildcard = '0.0.0.0';
                if (!sourceIp) return '% Incomplete command.';
            } else if (sourceIp.toLowerCase() === 'any') {
                sourceIp = '0.0.0.0';
                sourceWildcard = '255.255.255.255';
            } else {
                // Wildcard é opcional, padrão para um host exato se não for fornecido
                sourceWildcard = sourceWildcard || '0.0.0.0';
            }

            const accessLists: IAccessList[] = JSON.parse(JSON.stringify(device.config?.accessLists || []));
            const acl = accessLists.find(a => a.id === currentAclId);
            if (!acl) return "% Internal error: ACL disappeared.";

            if (isNegated) {
                // Remover a regra correspondente
                const initialRuleCount = acl.rules.length;
                acl.rules = acl.rules.filter(rule =>
                    !(rule.action === action && rule.sourceIp === sourceIp && rule.sourceWildcard === sourceWildcard)
                );
                if (acl.rules.length === initialRuleCount) return `% Rule not found.`;
            } else {
                // Adicionar a nova regra
                const newRule: IAclRule = {
                    id: crypto.randomUUID(),
                    action: action as 'permit' | 'deny',
                    sourceIp,
                    sourceWildcard
                };
                acl.rules.push(newRule);
            }
            updateConfig({ accessLists });
            return;
        }
        if (mode === 'config-vlan') {
            if (t0 === 'name' && t1) {
                const vlans = device.config?.vlans || [];
                const vlan = vlans.find(v => v.id === currentVlanId);
                if (vlan) {
                    vlan.name = t1;
                    updateConfig({ vlans });
                }
                return;
            }
        }

        if (mode === 'config-if' || mode === 'config-subif') {
            if (!currentInterface) return "% Internal error: No interface selected.";

            const [mainPort, subId] = currentInterface.split('.');
            const newInterfaces = JSON.parse(JSON.stringify(device.config?.interfaces || {}));
            if (!newInterfaces[mainPort]) newInterfaces[mainPort] = {};

            if (t0 === 'shutdown' || t0 === 'shut') {
                newInterfaces[mainPort].isUp = isNegated ? true : false;
                updateConfig({ interfaces: newInterfaces });
                return;
            }
            if (t0 === 'description' || t0 === 'desc') {
                newInterfaces[mainPort].description = isNegated ? undefined : commandTokens.slice(1).join(' ');
                updateConfig({ interfaces: newInterfaces });
                return;
            }

            if (device.type === 'router') {
                if (mode === 'config-subif') {
                    if ((t0 === 'encapsulation' || t0 === 'enc') && t1 === 'dot1q' && t2) {
                        if (t2 !== subId) {
                            return `% Configuring encapsulation on subinterface ${currentInterface} for a different VLAN is not allowed.`;
                        }
                        if (isNegated) {
                            if (newInterfaces[mainPort]?.subInterfaces?.[subId]) {
                                delete newInterfaces[mainPort].subInterfaces[subId];
                                updateConfig({ interfaces: newInterfaces });
                            }
                            return;
                        }
                        if (!newInterfaces[mainPort].subInterfaces) {
                            newInterfaces[mainPort].subInterfaces = {};
                        }
                        if (!newInterfaces[mainPort].subInterfaces[subId]) {
                            newInterfaces[mainPort].subInterfaces[subId] = {};
                        }
                        updateConfig({ interfaces: newInterfaces });
                        return;
                    }
                    if (t0 === 'ip' && (t1 === 'address' || t1 === 'add') && t2) {
                        if (!newInterfaces[mainPort].subInterfaces) newInterfaces[mainPort].subInterfaces = {};
                        if (isNegated) {
                            delete newInterfaces[mainPort].subInterfaces[subId];
                        } else {
                            newInterfaces[mainPort].subInterfaces[subId] = { ip: t2, subnetMask: rest[0] || '255.255.255.0' };
                        }
                        updateConfig({ interfaces: newInterfaces });
                        return;
                    }
                } else {
                    if (t0 === 'ip' && (t1 === 'address' || t1 === 'add') && (t2 || isNegated)) {
                        newInterfaces[mainPort].ip = isNegated ? undefined : t2;
                        newInterfaces[mainPort].subnetMask = isNegated ? undefined : rest[0];
                        updateConfig({ interfaces: newInterfaces });
                        return;
                    }
                }
            }

            if (mode === 'config-if') {
                const vlanInterfaceMatch = currentInterface.match(/^Vlan(\d+)$/i);
                if (vlanInterfaceMatch) {
                    if (t0 === 'ip' && (t1 === 'address' || t1 === 'add') && t2) {
                        const managementVlanId = vlanInterfaceMatch[1];
                        updateConfig({
                            managementVlanId,
                            managementIp: isNegated ? undefined : t2,
                            subnetMask: isNegated ? undefined : rest[0]
                        });
                        return;
                    }
                } else if (device.type === 'switch') {
                    if ((t0 === 'switchport' || t0 === 'swi') && t1 === 'mode' && t2) {
                        newInterfaces[currentInterface].mode = t2 as IPortModes;
                        updateConfig({ interfaces: newInterfaces });
                        return;
                    }
                    if ((t0 === 'switchport' || t0 === 'swi') && t1 === 'access' && t2 === 'vlan' && rest[0]) {
                        newInterfaces[currentInterface].accessVlan = isNegated ? undefined : rest[0];
                        updateConfig({ interfaces: newInterfaces });
                        return;
                    }
                    if ((t0 === 'switchport' || t0 === 'swi') && t1 === 'trunk' && t2 === 'native' && commandTokens[3] === 'vlan' && commandTokens[4]) {
                        newInterfaces[currentInterface].nativeVlan = isNegated ? undefined : commandTokens[4];
                        updateConfig({ interfaces: newInterfaces });
                        return;
                    }
                    if ((t0 === 'switchport' || t0 === 'swi') && t1 === 'trunk' && t2 === 'allowed' && commandTokens[3] === 'vlan' && commandTokens[4]) {
                        let allowedVlans = new Set(newInterfaces[currentInterface].trunkVlans || []);
                        const action = commandTokens[4];
                        const vlansToModify = parseVlanList(rest.slice(1).join(''));

                        if (action === 'add') {
                            vlansToModify.forEach(v => allowedVlans.add(v));
                        } else if (action === 'remove') {
                            vlansToModify.forEach(v => allowedVlans.delete(v));
                        } else {
                            const replacementVlans = parseVlanList(commandTokens.slice(4).join(','));
                            allowedVlans = isNegated ? new Set() : new Set(replacementVlans);
                        }

                        newInterfaces[currentInterface].trunkVlans = Array.from(allowedVlans).sort((a, b) => Number(a) - Number(b));
                        updateConfig({ interfaces: newInterfaces });
                        return;
                    }
                    if ((t0 === 'spanning-tree' || t0 === 'spa') && t1 === 'portfast') {
                        newInterfaces[currentInterface].portfast = !isNegated;
                        updateConfig({ interfaces: newInterfaces });
                        return;
                    }

                    if ((t0 === 'spanning-tree' || t0 === 'spa') && t1 === 'bpduguard' && t2 === 'enable') {
                        newInterfaces[currentInterface].bpduGuard = !isNegated;
                        updateConfig({ interfaces: newInterfaces });
                        return;
                    }

                    if (t0 === 'channel-group' && t1) {
                        const channelGroups: IChannelGroup[] = JSON.parse(JSON.stringify(device.config?.channelGroups || []));
                        let group = channelGroups.find(g => g.id === t1);

                        if (isNegated) {
                            if (group) {
                                group.interfaces = group.interfaces.filter(i => i !== currentInterface);
                            }
                        } else {
                            if (!group) {
                                group = { id: t1, interfaces: [], internalId: crypto.randomUUID() };
                                channelGroups.push(group);
                            }
                            if (!group.interfaces.includes(currentInterface)) {
                                group.interfaces.push(currentInterface);
                            }
                        }

                        const finalGroups = channelGroups.filter(g => g.interfaces.length > 0);
                        updateConfig({ channelGroups: finalGroups });
                        return `Configuring channel-group ${t1}`;
                    }
                }
            }
        }

        return `% Unrecognized command: "${cmd}"`;
    }

    function findLongestCommonPrefix(strs: string[]): string {
        if (!strs || strs.length === 0) return '';
        let prefix = strs[0];
        for (let i = 1; i < strs.length; i++) {
            while (strs[i].indexOf(prefix) !== 0) {
                prefix = prefix.substring(0, prefix.length - 1);
                if (prefix === '') return '';
            }
        }
        return prefix;
    }

    function handleAutoComplete() {
        const tokens = input.split(/\s+/);
        const currentWord = tokens[tokens.length - 1] || '';
        const commandPath = tokens.slice(0, -1);

        let currentNode: CommandTree | null = commands[mode];

        for (const token of commandPath) {
            if (currentNode && currentNode[token]) {
                currentNode = currentNode[token];
            } else {
                currentNode = null;
                break;
            }
        }

        if (currentNode === null) {
            return;
        }

        const matches = Object.keys(currentNode).filter(cmd => cmd.startsWith(currentWord));

        if (matches.length === 1) {
            const completedCmd = [...commandPath, matches[0], ''].join(' ');
            setInput(completedCmd);
        } else if (matches.length > 1) {
            const lcp = findLongestCommonPrefix(matches);
            if (lcp.length > currentWord.length) {
                const completedCmd = [...commandPath, lcp].join(' ');
                setInput(completedCmd);
            } else {
                appendLine(prompt() + input);
                appendLine(matches.join('  '));
            }
        }
    }

    function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (history.length > 0 && historyIndex < history.length - 1) {
                const newIndex = historyIndex + 1;
                setHistoryIndex(newIndex);
                setInput(history[newIndex]);
            }
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setInput(history[newIndex]);
            } else {
                setHistoryIndex(-1);
                setInput('');
            }
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCommand(input);
            setInput('');
        }
        if (e.key === 'Tab') {
            e.preventDefault();
            handleAutoComplete();
        }
    }

    return { lines, input, setInput, onKeyDown, prompt };
}