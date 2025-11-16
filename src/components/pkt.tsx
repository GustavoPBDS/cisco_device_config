'use client'
import React, { useState, useRef, useCallback, DragEvent, useEffect, useMemo } from 'react';
import ReactFlow, {
    ReactFlowProvider,
    addEdge,
    useNodesState,
    useEdgesState,
    Controls,
    Background,
    MiniMap,
    Connection,
    Edge,
    MarkerType,
    Node,
    SmoothStepEdge,
    StraightEdge,
    NodeChange
} from 'reactflow';

import 'reactflow/dist/style.css';
import Sidebar from './sidebar';
import CustomNode from './nodes/custom-node';
import ParallelStraightEdge from './edges/offset-edge';
import PCSvgComponent from './icons/devices/pc';
import RouterSvgComponent from './icons/devices/router';
import SwitchSvgComponent from './icons/devices/switch';
import { NetworkDeviceData } from '@/interfaces/devices';
import { useScenario } from '@/contexts/scenario.context';
import MenuDevice from './deviceMenus/menu-device';
import ScenarioActionsContainer from './scenario/actionsContainer';
import { toast } from 'sonner';


let id = 6;
const edgeTypes = { 'parallel-straight': ParallelStraightEdge };

export default function PacketTracerClone() {
    const { devices, addPc, addRouter, addSwitch, disconnectDevices, updateDevicePosition } = useScenario()
    const clickTimeout = useRef<any>(null)

    const [menuPorts, setMenuPorts] = useState(false)
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const [menu, setMenu] = useState<{ visible: boolean; node: Node<NetworkDeviceData> | null }>({
        visible: false,
        node: null,
    });
    const [connectionState, setConnectionState] = useState<{
        isConnecting: boolean;
        sourceNodeId: string | null;
        sourceNodePort: string | null;
    }>({
        isConnecting: false,
        sourceNodeId: null,
        sourceNodePort: null,
    });
    const nodeTypes = useMemo(() => ({ networkDevice: CustomNode }), []);

    const handleNodeClick = useCallback((event: React.MouseEvent, node: Node<NetworkDeviceData>) => {
        event.stopPropagation()
        const mouseOutScreenXLimit = window.innerWidth - event.clientX <= 250
        setMousePosition({
            x: mouseOutScreenXLimit ? window.innerWidth - 250 : event.clientX,
            y: event.clientY
        })

        !connectionState.isConnecting ? setMenuPorts(false) : setMenuPorts(true)

        if (menu.visible && menu.node?.id === node.id) {
            setMenu({ visible: false, node: null });
            return;
        }
        setMenu({ visible: true, node });
    }, [menu]);

    const handlePaneClick = useCallback(() => {
        setConnectionState({ isConnecting: false, sourceNodeId: null, sourceNodePort: null });
        setMenuPorts(false)
        setMenu({ visible: false, node: null });
    }, []);
    const [mobileDrag, setMobileDrag] = useState<{
        active: boolean;
        type: string | null;
        x: number;
        y: number;
    }>({
        active: false,
        type: null,
        x: 0,
        y: 0,
    });

    const warnDoubleClick = () => {
        toast.warning('Clique duas vezes para realizar a ação')
    }
    const handleEdgeClick = useCallback(() => {
        if (clickTimeout.current) {
            clearTimeout(clickTimeout.current);
        }
        clickTimeout.current = setTimeout(() => {
            warnDoubleClick();
        }, 250);
    }, []);

    const removeEdge = useCallback((e: React.MouseEvent, edge: Edge) => {
        if (clickTimeout.current) {
            clearTimeout(clickTimeout.current);
        }
        e.stopPropagation()
        disconnectDevices(edge.id)

        setEdges((eds) => eds.filter((e) => e.id !== edge.id))
    }, [])

    const onDrop = useCallback(
        (event: DragEvent) => {
            event.preventDefault();

            if (!reactFlowWrapper.current || !reactFlowInstance) {
                return;
            }

            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
            const type = event.dataTransfer.getData('application/react-flow');

            if (typeof type === 'undefined' || !type) {
                return;
            }

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX - reactFlowBounds.left - 40,
                y: event.clientY - reactFlowBounds.top - 50,
            });


            let device
            if (type === 'pc') {
                device = addPc(position)
            } else if (type === 'router') {
                device = addRouter(position)
            } else if (type === 'switch') {
                device = addSwitch(position)
            } else {
                device = addPc(position)
            }
        },
        [reactFlowInstance, addPc, addRouter, addSwitch]
    );

    const onDragStart = (event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/react-flow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    const onTouchStart = (event: React.TouchEvent, nodeType: string) => {
        const touch = event.touches[0];
        setMobileDrag({
            active: true,
            type: nodeType,
            x: touch.clientX,
            y: touch.clientY,
        });
        event.preventDefault();
    };
    const onNodeDragStop = useCallback((
        event: React.MouseEvent,
        node: Node<NetworkDeviceData>
    ) => {
        if (node.position) {
            updateDevicePosition(node.id, node.position);
        }
    }, [updateDevicePosition])

    useEffect(() => {
        if (!mobileDrag.active) {
            return;
        }

        const handleTouchMove = (event: TouchEvent) => {
            const touch = event.touches[0];
            setMobileDrag((d) => ({ ...d, x: touch.clientX, y: touch.clientY }));
        };

        const handleTouchEnd = (event: TouchEvent) => {
            if (event.touches.length === 0) {
                const simulatedEvent = {
                    preventDefault: () => { },
                    clientX: mobileDrag.x,
                    clientY: mobileDrag.y,
                    dataTransfer: {
                        getData: () => mobileDrag.type,
                    },
                } as any;

                onDrop(simulatedEvent);

                setMobileDrag({ active: false, type: null, x: 0, y: 0 });
            }
        };

        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [mobileDrag, onDrop]);
    useEffect(() => {
        const nodesFromContext = Array.from(devices.entries()).map(([id, deviceData]) => ({
            id: id,
            type: 'networkDevice',
            position: deviceData.position,
            data: deviceData,
        }));

        setNodes(nodesFromContext);

    }, [devices, setNodes])
    useEffect(() => {
        const edgesFromContext: Edge[] = [];
        const processedEdgeIds = new Set<string>();

        for (const [deviceId, deviceData] of devices.entries()) {

            for (const [edgeId, connectionInfo] of deviceData.portsConnected.entries()) {

                if (processedEdgeIds.has(edgeId)) {
                    continue;
                }

                const label = `${connectionInfo.port} ↔ ${connectionInfo.deviceConnectedPort}`;

                const newEdge: Edge = {
                    id: edgeId,
                    sourceHandle: 'center-source',
                    targetHandle: 'center-target',
                    source: deviceId,
                    target: connectionInfo.deviceConnected,
                    label: label,
                    type: 'parallel-straight',
                    style: { strokeWidth: 2, stroke: '#0891b2' },
                };

                edgesFromContext.push(newEdge);
                processedEdgeIds.add(edgeId); // Marca como processada
            }
        }

        const fixedEdges = edgesFromContext.map((e) => {
            const pairId = [e.source, e.target].sort().join('-');
            const siblings = edgesFromContext.filter(
                (s) => [s.source, s.target].sort().join('-') === pairId
            );

            const myIndex = siblings.findIndex(s => s.id === e.id);
            const isReverse = e.source > e.target;
            const direction = isReverse ? 'reverse' : 'forward';

            e.data = {
                index: myIndex,
                count: siblings.length,
                direction,
            };
            return e;
        });

        setEdges(fixedEdges);

    }, [devices, setEdges])

    const onDragOver = useCallback((event: DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    return (
        <div className="flex flex-col h-screen w-screen font-sans">
            <div className="flex flex-col-reverse flex-1">
                <ReactFlowProvider>
                    <Sidebar onDragStart={onDragStart} onTouchStart={onTouchStart} />
                    <div className="h-full w-full" ref={reactFlowWrapper}>
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            edgeTypes={edgeTypes}
                            nodeTypes={nodeTypes}
                            onNodesChange={onNodesChange}
                            onNodeDragStop={onNodeDragStop}
                            onEdgesChange={onEdgesChange}
                            onInit={setReactFlowInstance}
                            onDrop={onDrop}
                            onDragOver={onDragOver}
                            onNodeClick={handleNodeClick}
                            onPaneClick={handlePaneClick}
                            onEdgeClick={handleEdgeClick}
                            onEdgeDoubleClick={removeEdge}
                            fitView
                            onlyRenderVisibleElements
                        >
                            <Controls />
                            <Background gap={12} size={1} />
                        </ReactFlow>
                    </div>
                </ReactFlowProvider>
            </div>

            {mobileDrag.active && (
                <div
                    style={{
                        position: 'fixed',
                        left: mobileDrag.x,
                        top: mobileDrag.y,
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'none',
                        zIndex: 100,
                        padding: '10px',
                        backgroundColor: 'rgba(100, 150, 255, 0.7)',
                        borderRadius: '8px',
                        textAlign: 'center',
                    }}
                >
                    <span className="text-3xl">
                        {mobileDrag.type === 'pc' && <PCSvgComponent />}
                        {mobileDrag.type === 'router' && <RouterSvgComponent />}
                        {mobileDrag.type === 'switch' && <SwitchSvgComponent />}
                    </span>
                    <div className='font-bold text-white'>{mobileDrag.type}</div>
                </div>
            )}


            <ScenarioActionsContainer />

            <MenuDevice
                node={menu.node!}
                setNodes={setNodes}
                edges={edges}
                setEdges={setEdges}
                setMenu={setMenu}
                menu={menu}
                mousePosition={mousePosition}
                menuPorts={menuPorts}
                setMenuPorts={setMenuPorts}
                connectionState={connectionState}
                setConnectionState={setConnectionState}
            />
        </div>
    );
}