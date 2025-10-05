import { IChannelGroup } from "@/components/deviceMenus/configsForms/switch-form";
import { useScenario } from "@/contexts/scenario.context";
import { NetworkDeviceData, IPortModes } from "@/interfaces/devices";
import { useEffect, useState } from "react";
import { Node } from "reactflow";

type CliMode = 'exec' | 'privileged' | 'config' | 'config-vlan' | 'config-if' | 'config-subif';

export default function useCiscoCli(node: Node<NetworkDeviceData>) {
    const { devices, updateDeviceConfig } = useScenario()
    const device = devices.get(node.id)
    const [lines, setLines] = useState<string[]>(["Welcome to Cisco CLI Simulator."]);
    const [input, setInput] = useState("");
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [mode, setMode] = useState<CliMode>('exec');
    const [hostname, setHostname] = useState(device?.config?.hostname || device?.label || "Device");
    const [currentInterface, setCurrentInterface] = useState<string | null>(null);
    const [currentVlanId, setCurrentVlanId] = useState<string | null>(null)

    useEffect(() => {
        if (node) {
            setHostname(node.data?.config?.hostname || node.data?.label || "Device");
            setMode('exec');
            setCurrentInterface(null);
            setLines(["Welcome to Cisco CLI Simulator."]);
            setHistory([]);
            setHistoryIndex(-1);
        }
    }, [node?.id]); // A dependência agora é o ID, que é estável.

    // Efeito 2: Responsável por SINCRONIZAR o hostname no prompt.
    // Dispara se o hostname for alterado em outro lugar (ex: formulário).
    useEffect(() => {
        if (device) {
            setHostname(device.config?.hostname || device.label || "Device");
        }
    }, [device?.config?.hostname, device?.label]); // Depende apenas das strings do hostname/label.


    function prompt() {
        if (!device) return '> ';
        const modeSymbol: Record<CliMode, string> = {
            'exec': '>',
            'privileged': '#',
            'config': '(config)#',
            'config-vlan': '(config-vlan)#',
            'config-if': '(config-if)#',
            'config-subif': '(config-subif)#'
        };
        return `${hostname}${modeSymbol[mode]} `;
    }

    // Converte atalhos (g0/0) para nomes completos (GigabitEthernet0/0)
    function expandInterfaceName(shortcut: string): string | null {
        if (!device) return null;

        // 1. Separa a parte física da sub-interface
        const subInterfaceParts = shortcut.split('.');
        const physicalShortcut = subInterfaceParts[0]; // ex: "g0/1"
        const subInterfaceId = subInterfaceParts.length > 1 ? subInterfaceParts[1] : null; // ex: "10" ou null

        // 2. Expande APENAS a parte física
        const firstDigitIndex = physicalShortcut.search(/\d/);
        if (firstDigitIndex === -1) return null; // Atalho inválido

        const letterPart = physicalShortcut.substring(0, firstDigitIndex).toLowerCase(); // ex: "g"
        const numberPart = physicalShortcut.substring(firstDigitIndex); // ex: "0/1"

        const fullPhysicalName = device.ports.find(port => {
            const parts = port.split(' ');
            if (parts.length < 2) return false;

            const portLetterPart = parts[0].toLowerCase();
            const portNumberPart = parts.slice(1).join(' ');

            return portLetterPart.startsWith(letterPart) && portNumberPart === numberPart;
        });

        if (!fullPhysicalName) {
            return null; // Não encontrou a interface física base
        }

        // 3. Reconstrói o nome completo, adicionando o ID da sub-interface se ele existir
        return subInterfaceId ? `${fullPhysicalName}.${subInterfaceId}` : fullPhysicalName;
    }

    // Converte listas de VLANs ("10,20,30-35") em um array de strings
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
            if (mode === 'config-if' || mode === 'config-subif' || mode === 'config-vlan') {
                setMode('config');
                setCurrentInterface(null);
                setCurrentVlanId(null);
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
        }

        if (mode === 'config') {
            if (t0 === 'hostname' && t1) {
                setHostname(t1);
                updateConfig({ hostname: t1 });
                return;
            }
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
                setMode('config-vlan'); // Entra no modo de config da vlan
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
                // --- INÍCIO DA CORREÇÃO ---
                // Verifica primeiro se o comando é "interface vlan <id>"
                if (t1.toLowerCase() === 'vlan' && t2) {
                    const vlanId = t2;
                    // Internamente, continuamos a usar o formato "Vlan<id>" para consistência
                    setCurrentInterface(`Vlan${vlanId}`);
                    setMode('config-if');
                    return;
                }
                // --- FIM DA CORREÇÃO ---

                // Se não for "vlan", tenta expandir como uma interface física/sub-interface
                const fullName = expandInterfaceName(t1);
                if (fullName) {
                    setCurrentInterface(fullName);
                    setMode(fullName.includes('.') ? 'config-subif' : 'config-if');
                    return;
                }

                return '% Invalid interface type and number.';
            }
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

        // Comandos do modo de Configuração de Interface
        if (mode === 'config-if' || mode === 'config-subif') {
            if (!currentInterface) return "% Internal error: No interface selected.";

            const [mainPort, subId] = currentInterface.split('.');
            const newInterfaces = JSON.parse(JSON.stringify(device.config?.interfaces || {}));
            if (!newInterfaces[mainPort]) newInterfaces[mainPort] = {};

            // --- Comandos comuns a ambos os modos ---
            if (t0 === 'shutdown') {
                newInterfaces[mainPort].isUp = isNegated ? true : false;
                updateConfig({ interfaces: newInterfaces });
                return;
            }
            if (t0 === 'description') {
                newInterfaces[mainPort].description = isNegated ? undefined : commandTokens.slice(1).join(' ');
                updateConfig({ interfaces: newInterfaces });
                return;
            }

            // --- Comandos de Roteador ---
            if (device.type === 'router') {
                if (mode === 'config-subif') {
                    if ((t0 === 'encapsulation' || t0 === 'enc') && (t1 === 'dot1q' || t1 === 'dot') && t2) {
                        // Validação: o ID da VLAN deve ser o mesmo da sub-interface
                        if (t2 !== subId) {
                            return `% Configuring encapsulation on subinterface ${currentInterface} for a different VLAN is not allowed.`;
                        }

                        if (isNegated) {
                            // Remove toda a configuração da sub-interface
                            if (newInterfaces[mainPort]?.subInterfaces?.[subId]) {
                                delete newInterfaces[mainPort].subInterfaces[subId];
                                updateConfig({ interfaces: newInterfaces });
                            }
                            return;
                        }

                        // Cria a estrutura da sub-interface se não existir
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
                } else { // modo 'config-if' para roteador
                    if (t0 === 'ip' && (t1 === 'address' || t1 === 'add') && (t2 || isNegated)) {
                        newInterfaces[mainPort].ip = isNegated ? undefined : t2;
                        newInterfaces[mainPort].subnetMask = isNegated ? undefined : rest[0];
                        updateConfig({ interfaces: newInterfaces });
                        return;
                    }
                }
            }

            // --- Comandos válidos apenas para interfaces físicas/VLAN (não sub-interfaces) ---
            if (mode === 'config-if') {
                const vlanInterfaceMatch = currentInterface.match(/^Vlan(\d+)$/i);
                if (vlanInterfaceMatch) {
                    // Configurando uma SVI (interface Vlan)
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
                    // --- INÍCIO DO CÓDIGO RESTAURADO E COMPLETO ---

                    // Comandos de Switchport para interfaces físicas
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
                        } else { // Se não for 'add' ou 'remove', substitui a lista
                            const replacementVlans = parseVlanList(commandTokens.slice(4).join(','));
                            allowedVlans = isNegated ? new Set() : new Set(replacementVlans);
                        }

                        newInterfaces[currentInterface].trunkVlans = Array.from(allowedVlans).sort((a, b) => Number(a) - Number(b));
                        updateConfig({ interfaces: newInterfaces });
                        return;
                    }

                    // Comando de Channel-Group
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

    // Gerencia o histórico de comandos com as setas para cima/baixo
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
    }

    return { lines, input, setInput, onKeyDown, prompt };
}