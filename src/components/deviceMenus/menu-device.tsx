import { NetworkDeviceData } from "@/interfaces/devices";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Edge, MarkerType, Node } from "reactflow";
import PortMenu from "./menu-ports";
import { useScenario } from "@/contexts/scenario.context";
import MenuConfiguration from "./menu-configuration";
import { toast } from 'sonner';
import MenuExport from "./menu-export";
import MenuCLI from "./menu-cli";
interface IProps {
    node: Node<NetworkDeviceData>;
    setEdges: React.Dispatch<React.SetStateAction<Edge<any>[]>>
    edges: Edge<any>[]
    setMenu: React.Dispatch<React.SetStateAction<{
        visible: boolean;
        node: Node<NetworkDeviceData> | null;
    }>>
    menu: {
        visible: boolean;
        node: Node<NetworkDeviceData> | null;
    },
    mousePosition: {
        x: number;
        y: number;
    },
    menuPorts: boolean
    setMenuPorts: (open: boolean) => void
    connectionState: {
        isConnecting: boolean;
        sourceNodeId: string | null;
        sourceNodePort: string | null;
    },
    setConnectionState: React.Dispatch<React.SetStateAction<{
        isConnecting: boolean;
        sourceNodeId: string | null;
        sourceNodePort: string | null;
    }>>
    setNodes: React.Dispatch<React.SetStateAction<Node<NetworkDeviceData, string | undefined>[]>>
}

export default function MenuDevice({ node, setEdges, edges, setMenu, menu, mousePosition, menuPorts, setMenuPorts, connectionState, setConnectionState, setNodes }: IProps) {

    const { removeDevice, connectDevices } = useScenario()

    const [configurationMenuOpen, setConfigurationMenuOpen] = useState<{ visible: boolean; node: Node<NetworkDeviceData> | null }>({
        visible: false,
        node: null,
    });
    const [CLIMenuOpen, setCLIMenuOpen] = useState<{ visible: boolean; node: Node<NetworkDeviceData> | null }>({
        visible: false,
        node: null,
    });

    const clickTimeout = useRef<any>(null)

    const [exportConfigMenu, setExportConfigMenu] = useState<{ visible: boolean; node: Node<NetworkDeviceData> | null }>({
        visible: false,
        node: null,
    });
    const [memoizedNode, setMemoizedNode] = useState<Node<NetworkDeviceData> | null>(null);

    const handleSelectPort = useCallback((nodeId: string, port: string) => {
        if (!connectionState.isConnecting) {
            setConnectionState({
                isConnecting: true,
                sourceNodeId: nodeId,
                sourceNodePort: port,
            });
            setMenuPorts(false)
            setMenu({ visible: false, node: null });
        } else {
            if (connectionState.sourceNodeId === nodeId) {
                console.warn("Não é possível conectar um nó a ele mesmo.");
                setConnectionState({ isConnecting: false, sourceNodeId: null, sourceNodePort: null });
                setMenuPorts(false)
                setMenu({ visible: false, node: null });
                return;
            }

            const pairId = [connectionState.sourceNodeId, nodeId].sort().join('-');

            const isReverse = connectionState.sourceNodeId! > nodeId;
            const direction = isReverse ? 'reverse' : 'forward';

            const siblings = edges.filter(
                (e) => [e.source, e.target].sort().join('-') === pairId
            );
            const edgeId = `edge-${connectionState.sourceNodeId}-${nodeId}-${connectionState.sourceNodePort}-${port}`
            const newEdge: Edge = {
                id: edgeId,
                sourceHandle: 'center-source',
                targetHandle: 'center-target',
                source: connectionState.sourceNodeId!,
                target: nodeId,
                label: `${connectionState.sourceNodePort} ↔ ${port}`,
                type: 'parallel-straight',
                data: {
                    index: siblings.length,
                    count: siblings.length + 1,
                    direction,
                },
                style: { strokeWidth: 2, stroke: '#0891b2' },
            };
            setEdges((eds) => [...eds, newEdge].map((e, idx, all) => {
                const siblings = all.filter(
                    (s) => [s.source, s.target].sort().join('-') === pairId
                );
                siblings.forEach((s, i) => {
                    s.data = { ...(s.data ?? {}), index: i, count: siblings.length };
                });
                return e;
            }));
            connectDevices(
                edgeId,
                { id: nodeId, port },
                { id: connectionState.sourceNodeId!, port: connectionState.sourceNodePort! }
            )
            setConnectionState({ isConnecting: false, sourceNodeId: null, sourceNodePort: null });
            setMenuPorts(false)
            setMenu({ visible: false, node: null });
        }
    }, [connectionState, setEdges]);
    const closeConfMenu = () => {
        setConfigurationMenuOpen({ visible: false, node: null })
    }
    const closeExportMenu = () => {
        setExportConfigMenu({ visible: false, node: null })
    }
    const closeMenu = () => {
        setMenu({ visible: false, node: null })
    }
    const closeCLIMenu = () => {
        setCLIMenuOpen({ visible: false, node: null })
    }


    const warnDoubleClick = () => {
        toast.warning('Clique duas vezes para realizar a ação')
    }
    const handleClickDelete = useCallback(() => {
        if (clickTimeout.current) {
            clearTimeout(clickTimeout.current);
        }
        clickTimeout.current = setTimeout(() => {
            warnDoubleClick();
        }, 250);
    }, []);

    const handleDeleteDevice = () => {
        if (clickTimeout.current) {
            clearTimeout(clickTimeout.current);
        }
        if (node.id === configurationMenuOpen.node?.id) closeConfMenu()
        removeDevice(node.id);
        setNodes((nds) => nds.filter((n) => n.id !== node.id));
        setEdges((eds) => eds.filter((e) => e.source !== node.id && e.target !== node.id));
        if (node.id === menu.node?.id) closeMenu()
    }
    const handleConnectPorts = () => {
        setMenuPorts(true)
    }
    const handleOpenCLI = () => {
        setMemoizedNode(node)
        setCLIMenuOpen({ visible: true, node })

        closeMenu()
        closeExportMenu()
        closeConfMenu()
    }
    const handleConfigDevice = () => {
        setMemoizedNode(node)
        setConfigurationMenuOpen({ visible: true, node })

        closeCLIMenu()
        closeMenu()
        closeExportMenu()
    }
    const handleExportDevice = () => {
        setMemoizedNode(node)
        setExportConfigMenu({ visible: true, node })

        closeMenu()
        closeConfMenu()
        closeCLIMenu()
    }

    return (
        <div >

            {menu.visible && menu.node && <div
                className='z-10 absolute overflow-hidden'
                style={{
                    top: `${mousePosition.y}px`,
                    left: `${mousePosition.x}px`
                }}
            >

                {!menuPorts && (
                    <ul
                        className="p-1 max-h-48 overflow-y-auto bg-gray-800 shadow-xl rounded-md border border-gray-600 divide-y divide-zinc-500
                        scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar scrollbar-thumb-slate-500 scrollbar-track-transparent
                        "
                    >
                        <li>
                            <div
                                onClick={handleConfigDevice}
                                className="p-2 rounded-md hover:bg-blue-500 hover:text-white cursor-pointer transition-colors duration-150 text-sm font-semibold text-zinc-300 select-none">
                                Configurar Dispositivo
                            </div>
                        </li>
                        {node.data.type !== "pc" && <li>
                            <div
                                onClick={handleOpenCLI}
                                className="p-2 rounded-md hover:bg-blue-500 hover:text-white cursor-pointer transition-colors duration-150 text-sm font-semibold text-zinc-300 select-none">
                                Abrir CLI
                            </div>
                        </li>}
                        <li>
                            <div
                                onClick={handleExportDevice}
                                className="p-2 rounded-md hover:bg-blue-500 hover:text-white cursor-pointer transition-colors duration-150 text-sm font-semibold text-zinc-300 select-none">
                                Exportar Configuração
                            </div>
                        </li>

                        <li>
                            <div
                                onClick={handleClickDelete}
                                onDoubleClick={handleDeleteDevice}
                                className="p-2 rounded-md hover:bg-blue-500 hover:text-white cursor-pointer transition-colors duration-150 text-sm font-semibold text-zinc-300 select-none"
                            >
                                Deletar Dipositivo
                            </div>
                        </li>

                        <li>
                            <div
                                onClick={handleConnectPorts}
                                className="p-2 rounded-md hover:bg-blue-500 hover:text-white cursor-pointer transition-colors duration-150 text-sm font-semibold text-zinc-300 select-none"
                            >
                                Conectar Portas
                            </div>
                        </li>
                    </ul>
                )}


                {menuPorts && node && (<div
                    className=''
                >
                    <PortMenu
                        node={node}
                        onSelectPort={handleSelectPort}
                    />
                </div>
                )}

            </div>}


            {exportConfigMenu.visible && exportConfigMenu.node && memoizedNode && <MenuExport
                onClose={closeExportMenu}
                node={memoizedNode}
            />}

            {configurationMenuOpen.visible && configurationMenuOpen.node && memoizedNode && <MenuConfiguration
                onClose={() => closeConfMenu()}
                node={memoizedNode}
            />}

            {CLIMenuOpen.visible && CLIMenuOpen.node && memoizedNode && <MenuCLI
                onClose={() => closeCLIMenu()}
                node={memoizedNode}
            />}

            {connectionState.isConnecting && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white p-3 rounded-lg shadow-lg z-10 animate-pulse">
                    <p>Conectando de <strong>{connectionState.sourceNodePort}</strong>. Clique em um dispositivo de destino e escolha uma porta.</p>
                </div>
            )}
        </div>
    )
}